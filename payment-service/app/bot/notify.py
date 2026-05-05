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

# Telegram Markdown V1 reserved characters that need escaping when
# embedded in plain text (otherwise Telegram returns
# `Bad Request: can't parse entities`). We deliberately stick with V1
# because all our static formatting strings already use V1 syntax;
# moving to V2 would require escaping every `*`/`(`/`)` etc in static
# text too — much larger blast radius.
_MD_V1_RESERVED = ("\\", "_", "*", "`", "[")


def _escape_md_v1(text: str) -> str:
    """Backslash-escape the V1 entity delimiters in user-supplied text.

    Order matters: escape `\\` first so subsequent backslashes don't
    double-escape.
    """
    out = text
    for ch in _MD_V1_RESERVED:
        out = out.replace(ch, "\\" + ch)
    return out


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
    `comment` defensively at 1000 to leave headroom. The comment is
    Markdown-escaped so user-supplied `_`/`*`/`[`/`` ` `` don't break
    entity parsing on the Telegram side.
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
        lines.append(f"Комментарий: {_escape_md_v1(snippet)}")
    if auto_notice_triggered and auto_notice_id is not None:
        lines.append("")
        lines.append(
            f"🟡 *Авто-баннер активирован* (notice #{auto_notice_id}) — "
            f"порог жалоб по этой категории достигнут."
        )
    lines.append("")
    lines.append(f"_issue #{issue_id}_")
    return "\n".join(lines)
