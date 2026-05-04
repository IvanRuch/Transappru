"""
Business logic for data-issue ingest + auto-banner threshold.

The endpoint POST /data-issues/report calls `report_issue()`, which:
1. Creates a `DataIssue` row, returning HTTP 409 (via IntegrityError →
   IssueAlreadyOpenError) if the user already has an open complaint
   for the same (auto, category) — partial UNIQUE INDEX in migration 002.
2. Schedules out-of-band TG admin notification (best-effort, errors logged
   but never propagated — admin alerts must not block the user-facing API).
3. Evaluates the auto-banner threshold: ≥ AUTO_BANNER_THRESHOLD distinct
   user_ids for the same category in the last AUTO_BANNER_WINDOW_HOURS.
   If yes AND no notice is currently active for the category, creates one
   atomically. Concurrent threshold crossings are guarded by the partial
   UNIQUE INDEX on system_notice(category) WHERE deactivated_at IS NULL —
   the second writer's INSERT raises IntegrityError, which we treat as
   "already created by someone else, that's fine".

Cross-process notification to `payment-bot`:
    The bot worker container shares the same DB and aiogram Bot token.
    payment-service issues the admin alert directly via aiogram
    (`bot.notify.send_admin_alert`) — no Postgres LISTEN/NOTIFY required.
    See `app/bot/notify.py` for the outbound helper.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from tortoise.exceptions import IntegrityError

from app.config.settings import settings
from app.models import DataIssue, SystemNotice

logger = logging.getLogger(__name__)


class IssueAlreadyOpenError(Exception):
    """Raised when the user has an unresolved complaint for the same (auto, category)."""


@dataclass
class ReportOutcome:
    issue_id: int
    notice_triggered: bool
    notice_id: int | None


# Default text used when the auto-threshold flow creates a system_notice
# without admin input. Admin can later overwrite it via /banner_on.
AUTO_NOTICE_DEFAULT_MESSAGE_TPL = (
    "Возможны временные перебои в данных. Мы уже работаем над этим."
)


async def report_issue(
    *,
    user_id: int,
    auto_id: int,
    category: str,
    comment: str | None,
    fcm_token: str | None,
    platform: str | None,
    source_ip: str | None,
) -> ReportOutcome:
    """Insert one DataIssue row, evaluate threshold, return outcome.

    Rate-limit is layered: an app-level pre-check (below) for portability
    across SQLite (tests) and Postgres (production) + a partial UNIQUE
    INDEX `data_issues_open_unique` in migration 002 as the race-safe
    backstop in production.
    """
    open_existing = await DataIssue.filter(
        user_id=user_id,
        auto_id=auto_id,
        category=category,
        resolved_at__isnull=True,
    ).first()
    if open_existing is not None:
        raise IssueAlreadyOpenError(
            f"open complaint already exists user={user_id} auto={auto_id} cat={category}"
        )

    try:
        issue = await DataIssue.create(
            user_id=user_id,
            auto_id=auto_id,
            category=category,
            comment=comment,
            fcm_token=fcm_token,
            platform=platform,
            source_ip=source_ip,
        )
    except IntegrityError as exc:
        # Race lost to a concurrent reporter — the partial UNIQUE INDEX
        # in production rejected our INSERT after someone else's just
        # landed. Same outward semantics as the app-level pre-check.
        raise IssueAlreadyOpenError(
            f"open complaint already exists user={user_id} auto={auto_id} cat={category}"
        ) from exc

    has_fcm = fcm_token is not None and len(fcm_token) > 0
    logger.info(
        "data_issue.created id=%d user=%d auto=%d category=%s has_fcm_token=%s ip=%s",
        issue.id,
        user_id,
        auto_id,
        category,
        has_fcm,
        source_ip or "-",
    )

    notice_id = await _maybe_trigger_auto_banner(category)
    return ReportOutcome(
        issue_id=issue.id,
        notice_triggered=notice_id is not None,
        notice_id=notice_id,
    )


async def _maybe_trigger_auto_banner(category: str) -> int | None:
    """If threshold reached and no active notice, create one atomically.

    Returns the new SystemNotice.id when one was created in this call
    (caller may want to pass it to the TG bot for an "auto-banner activated"
    summary), or None when nothing changed.
    """
    if not settings.AUTO_BANNER_ENABLED:
        return None

    # Cheap early-out: if a notice is already active for this category
    # there is nothing to do. The partial UNIQUE INDEX guarantees at most
    # one active row, so .first() is sufficient.
    active_already = await SystemNotice.filter(
        category=category, deactivated_at__isnull=True
    ).first()
    if active_already is not None:
        return None

    window_start = datetime.now(timezone.utc) - timedelta(
        hours=settings.AUTO_BANNER_WINDOW_HOURS
    )
    distinct_users = await _count_distinct_complainants(category, window_start)
    if distinct_users < settings.AUTO_BANNER_THRESHOLD:
        return None

    try:
        notice = await SystemNotice.create(
            category=category,
            message=AUTO_NOTICE_DEFAULT_MESSAGE_TPL,
            source="auto",
        )
    except IntegrityError:
        # Another writer won the race — partial UNIQUE INDEX guards us.
        # That notice has the same category, just a different id; nothing
        # to do. Returning None signals "no new notice from THIS call".
        logger.info(
            "auto_threshold.fired category=%s but lost race — existing notice will be used",
            category,
        )
        return None

    logger.info(
        "auto_threshold.fired category=%s complaints=%d window_hours=%d notice_id=%d",
        category,
        distinct_users,
        settings.AUTO_BANNER_WINDOW_HOURS,
        notice.id,
    )
    return notice.id


async def _count_distinct_complainants(category: str, since: datetime) -> int:
    """Count distinct user_ids in `data_issues` for category created after `since`."""
    # Tortoise's high-level API does not expose COUNT(DISTINCT col) directly;
    # for portability between Postgres (prod) and SQLite (tests) we fall
    # back to fetching the unique user_id set in Python. For the tiny
    # rolling window this is O(complaints_in_window) — fine.
    rows = (
        await DataIssue.filter(category=category, created_at__gte=since)
        .distinct()
        .values_list("user_id", flat=True)
    )
    # `.distinct().values_list(...)` does not always emit DISTINCT in raw SQL
    # for SQLite, so dedupe in Python defensively.
    return len(set(rows))
