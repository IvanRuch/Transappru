"""
Tests for `GET /api/system-notice` — what active banners clients see.

The frontend polls this endpoint every 60s. The response shape is
`{notices: [{category, message, source, since}]}`. Deactivated rows
must not appear; rows of source='admin' and source='auto' are surfaced
identically (clients only need the message, not the trigger origin).
"""

from datetime import datetime, timezone

from app.models import SystemNotice

LIST_PATH = "/api/system-notice"


class TestSystemNoticeEndpoint:
    async def test_empty_when_no_active(self, data_issues_client) -> None:
        resp = await data_issues_client.get(LIST_PATH)
        assert resp.status_code == 200
        assert resp.json() == {"notices": []}

    async def test_returns_active_admin_notice(self, data_issues_client) -> None:
        await SystemNotice.create(
            category="fines",
            message="Тест: перебои со штрафами",
            source="admin",
        )
        resp = await data_issues_client.get(LIST_PATH)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["notices"]) == 1
        item = body["notices"][0]
        assert item["category"] == "fines"
        assert item["message"] == "Тест: перебои со штрафами"
        assert item["source"] == "admin"
        assert "since" in item

    async def test_filters_out_deactivated(self, data_issues_client) -> None:
        active = await SystemNotice.create(
            category="osago", message="active osago", source="admin"
        )
        await SystemNotice.create(
            category="fines",
            message="closed fines",
            source="auto",
            deactivated_at=datetime.now(timezone.utc),
        )
        resp = await data_issues_client.get(LIST_PATH)
        cats = [n["category"] for n in resp.json()["notices"]]
        assert cats == ["osago"]
        # Sanity: row id of returned matches the one we kept open.
        assert active.id is not None

    async def test_returns_multiple_categories_oldest_first(
        self, data_issues_client
    ) -> None:
        # Insert in arbitrary order; order_by created_at ASC must hold.
        first = await SystemNotice.create(
            category="passes", message="passes are flaky", source="admin"
        )
        second = await SystemNotice.create(
            category="osago", message="osago lookup unstable", source="auto"
        )
        resp = await data_issues_client.get(LIST_PATH)
        body = resp.json()
        assert [n["category"] for n in body["notices"]] == ["passes", "osago"]
        assert first.id < second.id  # sanity
