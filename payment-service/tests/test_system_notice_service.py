"""
Tests for app/services/system_notice.py: deactivate-with-recovery-push,
related-issues resolution, push-log persistence.

Firebase Admin SDK is mocked at module level — the service imports
`firebase_push.send_recovery_push`, we monkey-patch it to return a
synthetic PushResult and assert the side effects on
`system_notice_push_log` + `data_issues.resolved_at`.
"""

from datetime import datetime, timezone

from app.models import DataIssue, SystemNotice, SystemNoticePushLog
from app.services import firebase_push
from app.services import system_notice as notice_svc


async def _make_issue(
    *,
    user_id: int,
    auto_id: int,
    category: str,
    fcm_token: str | None,
) -> DataIssue:
    return await DataIssue.create(
        user_id=user_id,
        auto_id=auto_id,
        category=category,
        fcm_token=fcm_token,
    )


class TestActivateAdminNotice:
    async def test_creates_active_notice(self, initialized_db) -> None:
        notice = await notice_svc.activate_admin_notice("fines", "test text")
        assert notice.id is not None
        assert notice.deactivated_at is None
        assert notice.source == "admin"
        assert notice.message == "test text"

    async def test_get_active_for_category_returns_open(self, initialized_db) -> None:
        await notice_svc.activate_admin_notice("osago", "msg")
        active = await notice_svc.get_active_for_category("osago")
        assert active is not None
        assert active.category == "osago"

    async def test_get_active_for_category_ignores_closed(self, initialized_db) -> None:
        n = await notice_svc.activate_admin_notice("rnis", "old")
        n.deactivated_at = datetime.now(timezone.utc)
        await n.save()
        assert await notice_svc.get_active_for_category("rnis") is None


class TestDeactivateWithRecoveryPush:
    async def test_no_active_returns_none(self, initialized_db) -> None:
        assert (
            await notice_svc.deactivate_with_recovery_push("fines", send_push=True)
            is None
        )

    async def test_deactivates_without_push_when_send_false(
        self, initialized_db, monkeypatch
    ) -> None:
        await notice_svc.activate_admin_notice("fines", "msg")
        await _make_issue(user_id=1, auto_id=1, category="fines", fcm_token="tok-1")

        # Even though tokens exist, send_push=False must skip FCM.
        called = {"sent": False}

        def fake_send(*_args, **_kwargs):
            called["sent"] = True
            return firebase_push.PushResult(0, 0, [])

        monkeypatch.setattr(firebase_push, "send_recovery_push", fake_send)

        result = await notice_svc.deactivate_with_recovery_push(
            "fines", send_push=False
        )
        assert result is not None
        assert result.push_sent is False
        assert called["sent"] is False

        # Issue is resolved + linked to the notice.
        issue = await DataIssue.all().first()
        assert issue is not None
        assert issue.resolved_at is not None
        assert issue.notice_id == result.notice_id

    async def test_sends_push_to_distinct_complainant_tokens(
        self, initialized_db, monkeypatch
    ) -> None:
        await notice_svc.activate_admin_notice("fines", "msg")
        await _make_issue(user_id=1, auto_id=10, category="fines", fcm_token="tok-A")
        await _make_issue(user_id=2, auto_id=20, category="fines", fcm_token="tok-B")
        await _make_issue(user_id=3, auto_id=30, category="fines", fcm_token=None)
        # Duplicate token from a different user should be deduped.
        await _make_issue(user_id=4, auto_id=40, category="fines", fcm_token="tok-A")
        # Wrong category — must NOT receive push.
        await _make_issue(
            user_id=5, auto_id=50, category="osago", fcm_token="tok-OSAGO"
        )

        captured: dict = {}

        def fake_send(tokens, category, custom_body):
            captured["tokens"] = list(tokens)
            captured["category"] = category
            captured["custom_body"] = custom_body
            # Pretend tok-A succeeded, tok-B failed.
            return firebase_push.PushResult(
                success_count=1,
                failure_count=1,
                failures=[("tok-B", "unregistered")],
            )

        monkeypatch.setattr(firebase_push, "send_recovery_push", fake_send)

        result = await notice_svc.deactivate_with_recovery_push(
            "fines", send_push=True, custom_body="кастом"
        )
        assert result is not None
        assert result.push_sent is True
        assert sorted(captured["tokens"]) == ["tok-A", "tok-B"]
        assert captured["category"] == "fines"
        assert captured["custom_body"] == "кастом"

        # System_notice has push outcome saved.
        notice = await SystemNotice.get(id=result.notice_id)
        assert notice.push_sent_at is not None
        assert notice.push_recipient_count == 2
        assert notice.push_message == "кастом"

        # Per-token log persisted.
        logs = await SystemNoticePushLog.filter(notice_id=result.notice_id).all()
        assert len(logs) == 2
        log_by_token = {log.fcm_token: log for log in logs}
        assert log_by_token["tok-A"].status == "success"
        assert log_by_token["tok-B"].status == "failure"
        assert log_by_token["tok-B"].error_code == "unregistered"

        # All open complaints for fines were resolved + linked; osago
        # complaint stays open.
        open_after = await DataIssue.filter(resolved_at__isnull=True).all()
        assert {i.category for i in open_after} == {"osago"}


class TestResolveIssue:
    async def test_resolves_open(self, initialized_db) -> None:
        issue = await _make_issue(
            user_id=1, auto_id=1, category="fines", fcm_token=None
        )
        ok = await notice_svc.resolve_issue(issue.id)
        assert ok is True
        refreshed = await DataIssue.get(id=issue.id)
        assert refreshed.resolved_at is not None

    async def test_returns_false_when_already_resolved(self, initialized_db) -> None:
        issue = await _make_issue(
            user_id=1, auto_id=1, category="fines", fcm_token=None
        )
        issue.resolved_at = datetime.now(timezone.utc)
        await issue.save()
        assert await notice_svc.resolve_issue(issue.id) is False

    async def test_returns_false_for_missing(self, initialized_db) -> None:
        assert await notice_svc.resolve_issue(999_999) is False


class TestStaleTokenTombstone:
    """Permanently-dead FCM tokens (per Firebase Admin SDK error codes)
    must be NULL'd in `data_issues` so the next /banner_off doesn't
    re-attempt them. Verifies the integration with
    `deactivate_with_recovery_push`."""

    async def test_clears_unregistered_token_in_data_issues(
        self, initialized_db, monkeypatch
    ) -> None:
        await notice_svc.activate_admin_notice("fines", "msg")
        await _make_issue(
            user_id=10, auto_id=10, category="fines", fcm_token="dead-tok-A"
        )
        await _make_issue(
            user_id=20, auto_id=20, category="fines", fcm_token="live-tok-B"
        )

        def fake_send(tokens, category, custom_body):
            # tok-A returns `unregistered` (permanent), tok-B succeeds.
            return firebase_push.PushResult(
                success_count=1,
                failure_count=1,
                failures=[("dead-tok-A", "unregistered")],
            )

        monkeypatch.setattr(firebase_push, "send_recovery_push", fake_send)

        result = await notice_svc.deactivate_with_recovery_push("fines", send_push=True)
        assert result is not None and result.push_sent is True

        # Dead token: cleared in data_issues
        dead_issue = await DataIssue.get(user_id=10)
        assert dead_issue.fcm_token is None
        # Live token: untouched
        live_issue = await DataIssue.get(user_id=20)
        assert live_issue.fcm_token == "live-tok-B"

    async def test_does_not_clear_transient_failures(
        self, initialized_db, monkeypatch
    ) -> None:
        """`unknown` / network errors are transient — keep the token,
        next /banner_off may succeed."""
        await notice_svc.activate_admin_notice("osago", "msg")
        await _make_issue(
            user_id=30, auto_id=30, category="osago", fcm_token="transient-tok"
        )

        def fake_send(*_args, **_kwargs):
            return firebase_push.PushResult(
                success_count=0,
                failure_count=1,
                failures=[("transient-tok", "unknown")],
            )

        monkeypatch.setattr(firebase_push, "send_recovery_push", fake_send)
        await notice_svc.deactivate_with_recovery_push("osago", send_push=True)

        issue = await DataIssue.get(user_id=30)
        assert issue.fcm_token == "transient-tok"  # NOT cleared

    async def test_clears_all_known_permanent_codes(
        self, initialized_db, monkeypatch
    ) -> None:
        """Smoke test that every permanent error code in the allowlist
        triggers tombstoning."""
        await notice_svc.activate_admin_notice("rnis", "msg")
        permanent_codes = [
            "unregistered",
            "registration-token-not-registered",
            "invalid-argument",
            "invalid-registration-token",
            "sender-id-mismatch",
        ]
        for i, code in enumerate(permanent_codes):
            await _make_issue(
                user_id=100 + i,
                auto_id=100 + i,
                category="rnis",
                fcm_token=f"tok-{code}",
            )

        def fake_send(tokens, category, custom_body):
            return firebase_push.PushResult(
                success_count=0,
                failure_count=len(tokens),
                failures=[(t, t.split("tok-", 1)[1]) for t in tokens],
            )

        monkeypatch.setattr(firebase_push, "send_recovery_push", fake_send)
        await notice_svc.deactivate_with_recovery_push("rnis", send_push=True)

        for i in range(len(permanent_codes)):
            issue = await DataIssue.get(user_id=100 + i)
            assert issue.fcm_token is None, (
                f"token with permanent code {permanent_codes[i]} not tombstoned"
            )
