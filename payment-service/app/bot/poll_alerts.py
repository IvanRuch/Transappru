"""
Background task in the `payment-bot` sidecar that polls `data_issues`
for new rows and dispatches Telegram admin alerts.

Why this module exists (ADR-015):
    payment-service runs without VPN-routing to api.telegram.org because
    its outbound traffic must reach Kazna (RU) and the upstream Russian
    backend. The Telegram API is blocked from RU IP ranges — wrapping
    payment-service in the StrongSwan sidecar would either break Kazna
    (everything via US tunnel) or require a complex per-route firewall
    inside the namespace. Instead, payment-bot — which only ever talks
    to Telegram — owns the VPN namespace, and watches the database for
    new complaints rather than receiving an in-process function call.

Detection model:
    On startup, capture `MAX(id) FROM data_issues` as the high-water
    mark — older rows pre-date this bot instance and are NOT re-sent
    (would spam the admin with everything that ever happened). After
    that, a fresh `data_issues` row trips the next poll within
    POLL_INTERVAL_SEC, the bot dispatches the alert, advances the
    high-water mark, and continues.

Failure handling:
    Send failures (network blip, TG rate limit, transient 5xx) are
    logged and the high-water mark is NOT advanced for the failed
    issue, so the next poll retries it. Permanent-fail issues would
    re-spam forever — accepted risk at current cadence (~1/month);
    if it ever bites, add a dead-letter column.

Inline keyboard:
    Each alert ships with `[🟡 Активировать баннер] [✅ Закрыть жалобу]`
    callbacks identical to the originals built in `controllers.py`'s
    pre-VPN code path; the dispatcher in `handlers.py` already handles
    `banner_on:` and `resolve_issue:` callback prefixes.
"""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.bot.notify import format_admin_alert
from app.config.settings import settings
from app.models import DataIssue

logger = logging.getLogger(__name__)

# Cadence — admin sees a new complaint within this many seconds. ~1
# incident/month makes anything sub-minute fine; 5s gives a snappy feel
# during manual QA without flooding the DB.
POLL_INTERVAL_SEC: float = 5.0


async def _high_water_mark() -> int:
    """Largest issue id at startup — anything older was created before
    this bot instance and is intentionally NOT re-alerted on cold start
    (avoid replaying months of complaints into the admin chat)."""
    last = await DataIssue.all().order_by("-id").limit(1).values_list("id", flat=True)
    return last[0] if last else 0


def _build_keyboard(issue_id: int, category: str) -> InlineKeyboardMarkup:
    """Per-alert inline keyboard. Same callback prefixes the dispatcher
    in `handlers.py` already understands (`banner_on:` / `resolve_issue:`)."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🟡 Активировать баннер",
                    callback_data=f"banner_on:{category}:{issue_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="✅ Закрыть жалобу",
                    callback_data=f"resolve_issue:{issue_id}",
                ),
            ],
        ]
    )


async def _send_alert_for(bot: Bot, issue: DataIssue) -> bool:
    """Send one alert. Returns True iff Telegram accepted the message
    (so the caller can advance the high-water mark)."""
    text = format_admin_alert(
        issue_id=issue.id,
        user_id=issue.user_id,
        auto_id=issue.auto_id,
        category=issue.category,
        comment=issue.comment,
        # We don't replay the auto-banner trigger flag in poll mode —
        # by the time we see the issue, the threshold flow has already
        # run inside the controller. Including a stale flag would
        # mislead the admin.
        auto_notice_triggered=False,
        auto_notice_id=None,
    )
    try:
        await bot.send_message(
            chat_id=settings.TELEGRAM_ADMIN_CHAT_ID,
            text=text,
            reply_markup=_build_keyboard(issue.id, issue.category),
        )
        return True
    except TelegramAPIError as exc:
        # Network blip / rate limit / 5xx — keep the issue in the
        # outstanding set so the next poll retries it.
        logger.warning(
            "poll_alerts.send_failed issue_id=%d category=%s error=%s",
            issue.id,
            issue.category,
            exc,
        )
        return False
    except Exception as exc:  # noqa: BLE001
        # Defensive: any unexpected error (DB session, bot shutdown
        # mid-send) is non-fatal for the poll loop.
        logger.exception("poll_alerts.unexpected_error issue_id=%d: %s", issue.id, exc)
        return False


async def poll_for_new_alerts(bot: Bot) -> None:
    """Long-running task — runs alongside `dp.start_polling(bot, …)`
    in `bot_worker._run`.

    Cancellation: caller (asyncio.gather in bot_worker) propagates
    Cancelled on shutdown; we let it bubble up cleanly.
    """
    if settings.TELEGRAM_ADMIN_CHAT_ID == 0:
        logger.warning("poll_alerts disabled: TELEGRAM_ADMIN_CHAT_ID not configured")
        return

    last_seen_id = await _high_water_mark()
    logger.info(
        "poll_alerts.start interval_sec=%.1f initial_max_id=%d",
        POLL_INTERVAL_SEC,
        last_seen_id,
    )

    while True:
        try:
            new_issues = (
                await DataIssue.filter(id__gt=last_seen_id).order_by("id").all()
            )
            for issue in new_issues:
                if await _send_alert_for(bot, issue):
                    last_seen_id = issue.id
                else:
                    # Stop advancing on first failure to preserve order;
                    # next iteration will re-try this same issue.
                    break
        except asyncio.CancelledError:
            logger.info("poll_alerts.cancelled")
            raise
        except Exception as exc:  # noqa: BLE001
            # DB transient error: log and keep polling. Sleep prevents
            # tight error loop hammering the DB.
            logger.error("poll_alerts.poll_error: %s", exc)
        await asyncio.sleep(POLL_INTERVAL_SEC)
