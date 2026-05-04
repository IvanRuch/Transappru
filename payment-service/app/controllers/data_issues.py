"""
Litestar controller for client-facing data-issues endpoints.

POST /api/data-issues/report  — accept a single complaint
GET  /api/system-notice       — current active banners (polled by clients)
"""

from __future__ import annotations

import logging

from litestar import Controller, Request, get, post
from litestar.exceptions import HTTPException
from litestar.status_codes import (
    HTTP_201_CREATED,
    HTTP_409_CONFLICT,
)

from app.bot.notify import send_admin_alert
from app.schemas.data_issues import (
    ReportDataIssueRequest,
    ReportDataIssueResponse,
    SystemNoticeItem,
    SystemNoticeListResponse,
)
from app.services import data_issues as data_issues_svc
from app.services import system_notice as notice_svc

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str | None:
    """Best-effort extraction of the originating client IP.

    nginx in front of payment-service is configured to forward the
    real address in `X-Forwarded-For`; the first value is the client.
    Falls back to the immediate peer address. Never raises.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first[:45]  # IPv6 max
    if request.client and request.client.host:
        return request.client.host[:45]
    return None


class DataIssuesController(Controller):
    path = "/api"
    tags = ["data-issues"]

    @post("/data-issues/report", status_code=HTTP_201_CREATED)
    async def report(
        self, data: ReportDataIssueRequest, request: Request
    ) -> ReportDataIssueResponse:
        """Accept a single user complaint about a data category.

        Returns 409 if the user already has an open complaint for the
        same (auto, category) — partial UNIQUE INDEX in migration 002.

        Best-effort side effects (errors logged, never propagated):
          - Telegram admin alert
          - auto-banner threshold check
        """
        try:
            outcome = await data_issues_svc.report_issue(
                user_id=data.user_id,
                auto_id=data.auto_id,
                category=data.category,
                comment=data.comment,
                fcm_token=data.fcm_token,
                platform=data.platform,
                source_ip=_client_ip(request),
            )
        except data_issues_svc.IssueAlreadyOpenError as exc:
            raise HTTPException(
                status_code=HTTP_409_CONFLICT,
                detail="open complaint already exists for this user/auto/category",
            ) from exc

        # Fire-and-forget admin alert. We deliberately do NOT await within
        # a critical user-facing path that already returned a successful
        # DB write — but we DO await here because aiogram's HTTP call to
        # api.telegram.org is fast (~100ms p99). If that becomes a bottleneck
        # we move this to BackgroundTask.
        try:
            await send_admin_alert(
                issue_id=outcome.issue_id,
                user_id=data.user_id,
                auto_id=data.auto_id,
                category=data.category,
                comment=data.comment,
                auto_notice_triggered=outcome.notice_triggered,
                auto_notice_id=outcome.notice_id,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "send_admin_alert failed (non-fatal) issue_id=%d error=%s",
                outcome.issue_id,
                exc,
            )

        return ReportDataIssueResponse(
            id=outcome.issue_id,
            notice_triggered=outcome.notice_triggered,
        )

    @get("/system-notice")
    async def list_notices(self) -> SystemNoticeListResponse:
        """Return active system notices for the polling client."""
        notices = await notice_svc.get_active_notices()
        items = [
            SystemNoticeItem(
                category=n.category,  # type: ignore[arg-type]
                message=n.message,
                source=n.source,  # type: ignore[arg-type]
                since=n.created_at,
            )
            for n in notices
        ]
        return SystemNoticeListResponse(notices=items)
