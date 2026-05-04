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
