"""
Outbound Telegram messages from payment-service to the admin chat.

The bot dispatcher (inbound updates: commands, callbacks) lives in the
sibling `payment-bot` container — see `app/bot/bot_worker.py`. The
payment-service container only needs to *send* messages, so it builds
its own short-lived aiogram Bot instance per call. This avoids any
cross-process coordination (no LISTEN/NOTIFY, no broker) at the cost of
opening a fresh aiogram session per alert — fine given the expected
volume (~1 complaint/month, peaking maybe 10/incident).

Bot is silently disabled when TELEGRAM_BOT_TOKEN or
TELEGRAM_ADMIN_CHAT_ID is unset (test / local-dev / CI).
"""

from __future__ import annotations

import logging

from app.config.settings import settings
from app.services.firebase_push import PROVIDER_LABELS

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN) and settings.TELEGRAM_ADMIN_CHAT_ID > 0


def _format_alert(
    *,
    issue_id: int,
    user_id: int,
    auto_id: int,
    category: str,
    comment: str | None,
    auto_notice_triggered: bool,
    auto_notice_id: int | None,
) -> str:
    label = PROVIDER_LABELS.get(category, category)
    lines = [
        "⚠️ *Жалоба на данные*",
        f"Категория: *{label}* (`{category}`)",
        f"Auto: `{auto_id}`",
        f"Юзер: `{user_id}`",
    ]
    if comment:
        # Limit comment length defensively; TG message body cap is 4096.
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


async def send_admin_alert(
    *,
    issue_id: int,
    user_id: int,
    auto_id: int,
    category: str,
    comment: str | None,
    auto_notice_triggered: bool,
    auto_notice_id: int | None,
) -> None:
    """Best-effort outbound. Returns silently when bot is unconfigured."""
    if not _is_configured():
        logger.debug(
            "send_admin_alert skipped: bot not configured (issue_id=%d)", issue_id
        )
        return

    text = _format_alert(
        issue_id=issue_id,
        user_id=user_id,
        auto_id=auto_id,
        category=category,
        comment=comment,
        auto_notice_triggered=auto_notice_triggered,
        auto_notice_id=auto_notice_id,
    )

    # Inline keyboard: Activate banner manually (only shown when auto wasn't
    # triggered, otherwise admin already got it), plus Resolve issue.
    try:
        from aiogram import Bot
        from aiogram.client.default import DefaultBotProperties
        from aiogram.enums import ParseMode
        from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
    except ImportError:
        logger.warning("aiogram not installed at runtime; admin alert dropped")
        return

    buttons: list[list[InlineKeyboardButton]] = []
    if not auto_notice_triggered:
        buttons.append(
            [
                InlineKeyboardButton(
                    text="🟡 Активировать баннер",
                    callback_data=f"banner_on:{category}:{issue_id}",
                ),
            ]
        )
    buttons.append(
        [
            InlineKeyboardButton(
                text="✅ Закрыть жалобу",
                callback_data=f"resolve_issue:{issue_id}",
            ),
        ]
    )
    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

    bot = Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN),
    )
    try:
        await bot.send_message(
            chat_id=settings.TELEGRAM_ADMIN_CHAT_ID,
            text=text,
            reply_markup=keyboard,
        )
    finally:
        await bot.session.close()
