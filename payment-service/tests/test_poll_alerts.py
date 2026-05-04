"""
Tests for the `payment-bot` poll loop that dispatches admin TG alerts
on new `data_issues` rows (ADR-015).

The aiogram `Bot` object is replaced with a stub that records calls
to `send_message`, so we don't depend on a Telegram-reachable network
(SQLite + asyncio is enough). The high-water mark behaviour, send
failure → no advance, and TelegramAPIError tolerance are all
exercised via direct calls to `_send_alert_for` /
`_high_water_mark` / `poll_for_new_alerts` (with cancellation).
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest_asyncio
from aiogram.exceptions import TelegramAPIError

from app.bot import poll_alerts
from app.config.settings import settings
from app.models import DataIssue


class StubBot:
    """Records all `send_message` invocations; can be configured to
    raise on the next call to simulate transient TG failures."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.fail_next: Exception | None = None

    async def send_message(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        if self.fail_next is not None:
            err, self.fail_next = self.fail_next, None
            raise err
        self.calls.append(kwargs)


@pytest_asyncio.fixture
async def configured_admin(monkeypatch):
    """Set `TELEGRAM_ADMIN_CHAT_ID` so poll_for_new_alerts doesn't
    short-circuit. Restored after the test."""
    monkeypatch.setattr(settings, "TELEGRAM_ADMIN_CHAT_ID", 999999)


class TestHighWaterMark:
    async def test_returns_zero_on_empty_table(self, initialized_db) -> None:
        assert await poll_alerts._high_water_mark() == 0

    async def test_returns_max_id(self, initialized_db) -> None:
        await DataIssue.create(user_id=1, auto_id=1, category="fines")
        await DataIssue.create(user_id=2, auto_id=2, category="osago")
        third = await DataIssue.create(user_id=3, auto_id=3, category="rnis")
        assert await poll_alerts._high_water_mark() == third.id


class TestSendAlertFor:
    async def test_sends_message_with_keyboard(
        self, initialized_db, configured_admin
    ) -> None:
        issue = await DataIssue.create(
            user_id=42, auto_id=7, category="fines", comment="штраф пропал"
        )
        bot = StubBot()

        ok = await poll_alerts._send_alert_for(bot, issue)  # type: ignore[arg-type]

        assert ok is True
        assert len(bot.calls) == 1
        call = bot.calls[0]
        assert call["chat_id"] == settings.TELEGRAM_ADMIN_CHAT_ID
        assert "Жалоба на данные" in call["text"]
        assert "штраф пропал" in call["text"]
        # Inline keyboard must carry both `banner_on:` and `resolve_issue:`
        # callbacks so the dispatcher in `handlers.py` can route them.
        keyboard = call["reply_markup"]
        flat = [btn.callback_data for row in keyboard.inline_keyboard for btn in row]
        assert any(cb.startswith("banner_on:fines:") for cb in flat)
        assert any(cb.startswith(f"resolve_issue:{issue.id}") for cb in flat)

    async def test_returns_false_on_telegram_api_error(
        self, initialized_db, configured_admin
    ) -> None:
        issue = await DataIssue.create(user_id=1, auto_id=1, category="osago")
        bot = StubBot()
        bot.fail_next = TelegramAPIError(
            method=type("M", (), {"__name__": "send_message"})(),  # type: ignore[arg-type]
            message="rate limited",
        )
        # Caller (poll_for_new_alerts) must NOT advance high-water on
        # a False return — that's the whole point.
        ok = await poll_alerts._send_alert_for(bot, issue)  # type: ignore[arg-type]
        assert ok is False
        assert bot.calls == []

    async def test_returns_false_on_unexpected_error(
        self, initialized_db, configured_admin
    ) -> None:
        issue = await DataIssue.create(user_id=1, auto_id=1, category="passes")
        bot = StubBot()
        bot.fail_next = RuntimeError("boom")
        ok = await poll_alerts._send_alert_for(bot, issue)  # type: ignore[arg-type]
        assert ok is False


class TestPollLoop:
    async def test_disabled_when_admin_chat_id_unset(
        self, initialized_db, monkeypatch
    ) -> None:
        """When admin chat is 0, the loop must return immediately
        (no infinite wait)."""
        monkeypatch.setattr(settings, "TELEGRAM_ADMIN_CHAT_ID", 0)
        bot = StubBot()
        # Returns without entering the while loop.
        await asyncio.wait_for(
            poll_alerts.poll_for_new_alerts(bot),  # type: ignore[arg-type]
            timeout=1.0,
        )
        assert bot.calls == []

    async def test_high_water_skips_existing_rows_on_start(
        self, initialized_db, configured_admin, monkeypatch
    ) -> None:
        """Pre-existing complaints must NOT be re-alerted on cold start
        (avoid replaying months of history into the admin chat)."""
        # Pre-existing complaints — must be ignored.
        for uid in (1, 2):
            await DataIssue.create(user_id=uid, auto_id=uid, category="fines")

        # Speed-run by patching the sleep to a tiny value.
        monkeypatch.setattr(poll_alerts, "POLL_INTERVAL_SEC", 0.05)

        bot = StubBot()
        task = asyncio.create_task(poll_alerts.poll_for_new_alerts(bot))  # type: ignore[arg-type]
        try:
            await asyncio.sleep(0.2)  # let it poll once or twice
            assert bot.calls == []  # nothing alerted yet

            # New complaint AFTER startup → must be alerted.
            new = await DataIssue.create(user_id=99, auto_id=99, category="osago")
            await asyncio.sleep(0.3)  # poll picks it up

            assert any(
                f"resolve_issue:{new.id}" in btn.callback_data
                for call in bot.calls
                for row in call["reply_markup"].inline_keyboard
                for btn in row
            ), f"new issue {new.id} not alerted; calls={bot.calls}"
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def test_failed_send_blocks_advance_and_retries_next_poll(
        self, initialized_db, configured_admin, monkeypatch
    ) -> None:
        """If TG fails for issue N, the loop must NOT advance to N+1
        — it'll retry N on the next iteration. Without this, a
        single transient blip silently drops a complaint."""
        monkeypatch.setattr(poll_alerts, "POLL_INTERVAL_SEC", 0.05)

        bot = StubBot()
        # Fail the first call, then succeed.
        bot.fail_next = TelegramAPIError(
            method=type("M", (), {"__name__": "send_message"})(),  # type: ignore[arg-type]
            message="transient",
        )

        task = asyncio.create_task(poll_alerts.poll_for_new_alerts(bot))  # type: ignore[arg-type]
        try:
            await asyncio.sleep(0.05)
            issue = await DataIssue.create(user_id=5, auto_id=5, category="rnis")
            await asyncio.sleep(0.5)  # several poll cycles
            # Should eventually succeed after the first failure.
            assert any(
                f"resolve_issue:{issue.id}" in btn.callback_data
                for call in bot.calls
                for row in call["reply_markup"].inline_keyboard
                for btn in row
            )
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
