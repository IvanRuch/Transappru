"""
Pure formatting for the admin Telegram alert sent on every new
`data_issues` row. The actual outbound send lives in `poll_alerts.py`
(running inside the `payment-bot` sidecar), which has VPN-routed
access to api.telegram.org — payment-service does not.

Kept as a separate module so the formatter is testable in isolation
and the bot worker code stays focused on lifecycle / asyncio plumbing.
"""

from __future__ import annotations

from app.services.firebase_push import PROVIDER_LABELS


def format_admin_alert(
    *,
    issue_id: int,
    user_id: int,
    auto_id: int,
    category: str,
    comment: str | None,
    auto_notice_triggered: bool,
    auto_notice_id: int | None,
) -> str:
    """Build the markdown body for the admin TG alert.

    The TG message body cap is 4096 chars; we trim user-supplied
    `comment` defensively at 1000 to leave headroom.
    """
    label = PROVIDER_LABELS.get(category, category)
    lines = [
        "⚠️ *Жалоба на данные*",
        f"Категория: *{label}* (`{category}`)",
        f"Auto: `{auto_id}`",
        f"Юзер: `{user_id}`",
    ]
    if comment:
        snippet = comment if len(comment) <= 1000 else comment[:1000] + "…"
        lines.append(f"Комментарий: {snippet}")
    if auto_notice_triggered and auto_notice_id is not None:
        lines.append("")
        lines.append(
            f"🟡 *Авто-баннер активирован* (notice #{auto_notice_id}) — "
            f"порог жалоб по этой категории достигнут."
        )
    lines.append("")
    lines.append(f"_issue #{issue_id}_")
    return "\n".join(lines)
