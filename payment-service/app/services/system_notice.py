"""
Lifecycle of system_notice rows: get-active, activate (admin), deactivate
(admin) + recovery push fan-out, with logging into system_notice_push_log.

Activation is invoked from the Telegram bot (`/banner_on`); deactivation
likewise (`/banner_off`) after the admin confirms whether to send recovery
push to complainants. Auto-banner activation is in
`services/data_issues.py:_maybe_trigger_auto_banner` because it shares
the same partial-UNIQUE-INDEX-guarded INSERT path.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from app.models import DataIssue, SystemNotice, SystemNoticePushLog
from app.services import firebase_push

logger = logging.getLogger(__name__)


@dataclass
class DeactivationResult:
    notice_id: int
    push_sent: bool
    push_recipient_count: int
    push_success_count: int
    push_failure_count: int


async def get_active_notices() -> list[SystemNotice]:
    """All currently active system notices, oldest first."""
    return (
        await SystemNotice.filter(deactivated_at__isnull=True)
        .order_by("created_at")
        .all()
    )


async def get_active_for_category(category: str) -> SystemNotice | None:
    return await SystemNotice.filter(
        category=category, deactivated_at__isnull=True
    ).first()


async def activate_admin_notice(category: str, message: str) -> SystemNotice:
    """Manual activation triggered by admin /banner_on.

    Raises IntegrityError when the partial UNIQUE INDEX rejects the INSERT
    because there is already an active notice for this category — the bot
    handler should translate that into a friendly Telegram reply
    ("уже активен", with /issues link).
    """
    notice = await SystemNotice.create(
        category=category,
        message=message,
        source="admin",
    )
    logger.info(
        "system_notice.activated id=%d category=%s source=admin",
        notice.id,
        category,
    )
    return notice


async def deactivate_with_recovery_push(
    category: str,
    *,
    send_push: bool,
    custom_body: str | None = None,
) -> DeactivationResult | None:
    """Close the active notice for `category`, optionally fan out FCM push
    to all complainants of that incident.

    Returns None when there is no active notice for `category` (caller
    can interpret that as "nothing to do, already off").
    """
    notice = await SystemNotice.filter(
        category=category, deactivated_at__isnull=True
    ).first()
    if notice is None:
        return None

    # Mark the notice deactivated FIRST so the next /system-notice poll
    # immediately stops surfacing the banner — even if the push step
    # fails or is slow. Better UX than waiting for FCM round-trip.
    now = datetime.now(timezone.utc)
    notice.deactivated_at = now
    if custom_body:
        notice.push_message = custom_body
    await notice.save()

    # Resolve the related complaints (open issues for this category that
    # have no notice attached, plus those already linked).
    await _close_related_issues(notice)

    if not send_push:
        logger.info(
            "system_notice.deactivated id=%d category=%s push_skipped=true",
            notice.id,
            category,
        )
        return DeactivationResult(
            notice_id=notice.id,
            push_sent=False,
            push_recipient_count=0,
            push_success_count=0,
            push_failure_count=0,
        )

    tokens = await _collect_recovery_tokens(notice.id, category)
    push_result = firebase_push.send_recovery_push(tokens, category, custom_body)

    # Persist outcome on the notice + per-token log for postmortems.
    notice.push_sent_at = now
    notice.push_recipient_count = len(tokens)
    await notice.save()

    for token in tokens:
        # Default: assume success; mark failure rows below.
        # We re-iterate failures explicitly to capture error_code.
        pass
    failed_set = {t for t, _ in push_result.failures}
    rows: list[SystemNoticePushLog] = []
    for token in tokens:
        if token in failed_set:
            err = next((e for t, e in push_result.failures if t == token), None)
            rows.append(
                SystemNoticePushLog(
                    notice_id=notice.id,
                    fcm_token=token,
                    status="failure",
                    error_code=err,
                )
            )
        else:
            rows.append(
                SystemNoticePushLog(
                    notice_id=notice.id,
                    fcm_token=token,
                    status="success",
                )
            )
    if rows:
        await SystemNoticePushLog.bulk_create(rows)

    logger.info(
        "system_notice.deactivated id=%d category=%s push_recipients=%d "
        "push_success=%d push_failure=%d",
        notice.id,
        category,
        len(tokens),
        push_result.success_count,
        push_result.failure_count,
    )
    return DeactivationResult(
        notice_id=notice.id,
        push_sent=True,
        push_recipient_count=len(tokens),
        push_success_count=push_result.success_count,
        push_failure_count=push_result.failure_count,
    )


async def _close_related_issues(notice: SystemNotice) -> None:
    """Mark all open complaints for the notice's category as resolved
    and link them to this notice for postmortem traceability."""
    now = datetime.now(timezone.utc)
    open_issues = await DataIssue.filter(
        category=notice.category, resolved_at__isnull=True
    ).all()
    for issue in open_issues:
        issue.resolved_at = now
        # Only set notice_id if not already set (could be set by an
        # earlier auto-banner that we re-attached).
        if issue.notice_id is None:
            issue.notice_id = notice.id
        await issue.save()


async def _collect_recovery_tokens(notice_id: int, category: str) -> list[str]:
    """Distinct non-empty FCM tokens of users who complained about this
    category — both those linked to the notice and any open ones we just
    closed (covered by _close_related_issues)."""
    rows = await DataIssue.filter(
        category=category, fcm_token__isnull=False
    ).values_list("fcm_token", flat=True)
    # Dedup + filter empty strings.
    return sorted({t for t in rows if t})


async def count_open_issues() -> int:
    return await DataIssue.filter(resolved_at__isnull=True).count()


async def list_open_issues(limit: int = 20) -> list[DataIssue]:
    return (
        await DataIssue.filter(resolved_at__isnull=True)
        .order_by("-created_at")
        .limit(limit)
        .all()
    )


async def resolve_issue(issue_id: int) -> bool:
    """Manually mark a single complaint resolved without touching banners.
    Used by the bot's "Закрыть жалобу" inline button. Returns False if the
    issue was already resolved or does not exist."""
    issue = await DataIssue.filter(id=issue_id, resolved_at__isnull=True).first()
    if issue is None:
        return False
    issue.resolved_at = datetime.now(timezone.utc)
    await issue.save()
    return True
