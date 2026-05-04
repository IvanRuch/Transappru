"""
Tests for the public client-facing data-issues endpoints.

`POST /api/data-issues/report` accepts complaints and returns 201;
`GET /api/system-notice` returns currently active banners.

Edge cases covered:
  - happy path: 1 complaint → 201, ID returned, no auto-banner yet
  - rate-limit: re-posting same (user, auto, category) while open → 409
  - threshold-reached: 3 distinct complainants → auto-banner created,
    `notice_triggered=True` on the third response
  - subsequent complaints after auto-banner do NOT plant a second notice
  - validation: missing required field → 400
  - unknown category → 400 (Pydantic Literal rejection)

The Telegram admin-alert side effect is silenced by the absence of
TELEGRAM_BOT_TOKEN in the test environment (see app/bot/notify.py
`_is_configured`).
"""

from app.models import DataIssue, SystemNotice

REPORT_PATH = "/api/data-issues/report"
LIST_PATH = "/api/system-notice"


def _make_payload(
    *,
    user_id: int = 1,
    auto_id: int = 1,
    category: str = "fines",
    comment: str | None = None,
    fcm_token: str | None = None,
    platform: str | None = None,
) -> dict:
    body: dict = {"user_id": user_id, "auto_id": auto_id, "category": category}
    if comment is not None:
        body["comment"] = comment
    if fcm_token is not None:
        body["fcm_token"] = fcm_token
    if platform is not None:
        body["platform"] = platform
    return body


class TestReportEndpoint:
    async def test_happy_path(self, data_issues_client) -> None:
        resp = await data_issues_client.post(
            REPORT_PATH,
            json=_make_payload(comment="штраф был, в приложении нет", fcm_token="abc"),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert "id" in body
        assert body["notice_triggered"] is False

        rows = await DataIssue.all()
        assert len(rows) == 1
        assert rows[0].fcm_token == "abc"
        assert rows[0].comment == "штраф был, в приложении нет"

    async def test_repeat_same_user_auto_category_returns_409(
        self, data_issues_client
    ) -> None:
        first = await data_issues_client.post(REPORT_PATH, json=_make_payload())
        assert first.status_code == 201

        second = await data_issues_client.post(REPORT_PATH, json=_make_payload())
        assert second.status_code == 409
        # Only one row landed.
        assert await DataIssue.all().count() == 1

    async def test_repeat_different_category_is_allowed(
        self, data_issues_client
    ) -> None:
        await data_issues_client.post(REPORT_PATH, json=_make_payload(category="fines"))
        resp = await data_issues_client.post(
            REPORT_PATH, json=_make_payload(category="osago")
        )
        assert resp.status_code == 201
        assert await DataIssue.all().count() == 2

    async def test_repeat_after_resolved_is_allowed(self, data_issues_client) -> None:
        await data_issues_client.post(REPORT_PATH, json=_make_payload())
        # Resolve the previous one (admin /banner_off would do this).
        from datetime import datetime, timezone

        issue = await DataIssue.all().first()
        assert issue is not None
        issue.resolved_at = datetime.now(timezone.utc)
        await issue.save()

        resp = await data_issues_client.post(REPORT_PATH, json=_make_payload())
        assert resp.status_code == 201

    async def test_threshold_triggers_auto_banner_on_third(
        self, data_issues_client
    ) -> None:
        # Three different user_ids on the same category within the
        # default 6h window — third complaint trips the threshold.
        for uid in (1, 2):
            r = await data_issues_client.post(
                REPORT_PATH, json=_make_payload(user_id=uid, auto_id=10 + uid)
            )
            assert r.status_code == 201
            assert r.json()["notice_triggered"] is False

        third = await data_issues_client.post(
            REPORT_PATH, json=_make_payload(user_id=3, auto_id=13)
        )
        assert third.status_code == 201
        assert third.json()["notice_triggered"] is True

        notices = await SystemNotice.filter(deactivated_at__isnull=True).all()
        assert len(notices) == 1
        assert notices[0].source == "auto"
        assert notices[0].category == "fines"

    async def test_fourth_complaint_does_not_create_second_notice(
        self, data_issues_client
    ) -> None:
        for uid in (1, 2, 3, 4):
            await data_issues_client.post(
                REPORT_PATH, json=_make_payload(user_id=uid, auto_id=10 + uid)
            )
        # Exactly one active notice — fourth complaint should not have
        # created another one.
        active = await SystemNotice.filter(deactivated_at__isnull=True).all()
        assert len(active) == 1

    async def test_missing_user_id_returns_400(self, data_issues_client) -> None:
        payload = _make_payload()
        del payload["user_id"]
        resp = await data_issues_client.post(REPORT_PATH, json=payload)
        assert resp.status_code == 400

    async def test_unknown_category_returns_400(self, data_issues_client) -> None:
        resp = await data_issues_client.post(
            REPORT_PATH, json=_make_payload(category="nonsense")
        )
        assert resp.status_code == 400

    async def test_response_records_notice_triggered_only_when_created(
        self, data_issues_client
    ) -> None:
        # First two: nothing.
        await data_issues_client.post(
            REPORT_PATH, json=_make_payload(user_id=1, auto_id=11)
        )
        await data_issues_client.post(
            REPORT_PATH, json=_make_payload(user_id=2, auto_id=12)
        )
        # Third trips threshold → notice_triggered True.
        third = await data_issues_client.post(
            REPORT_PATH, json=_make_payload(user_id=3, auto_id=13)
        )
        assert third.json()["notice_triggered"] is True
        # Fourth: notice already there, so notice_triggered False.
        fourth = await data_issues_client.post(
            REPORT_PATH, json=_make_payload(user_id=4, auto_id=14)
        )
        assert fourth.json()["notice_triggered"] is False
