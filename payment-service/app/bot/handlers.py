"""
aiogram v3 dispatcher handlers — admin commands + inline-button callbacks
+ confirmation flow for /banner_off recovery push.

State machine for /banner_off uses an in-memory FSM context (aiogram
MemoryStorage). The bot is single-user (one admin), single-process,
restart-tolerant — confirmations that span a restart are simply lost
and admin re-issues `/banner_off`.
"""

from __future__ import annotations

import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from tortoise.exceptions import IntegrityError

from app.config.settings import settings
from app.models import DATA_CATEGORIES, DataIssue
from app.services import system_notice as notice_svc
from app.services.firebase_push import PROVIDER_LABELS

logger = logging.getLogger(__name__)
router = Router(name="admin")


def _is_admin(user_id: int | None) -> bool:
    """True iff the message comes from the configured admin chat_id."""
    return user_id is not None and user_id == settings.TELEGRAM_ADMIN_CHAT_ID


# Reverse map for parsing /banner_on category arguments — admin can type
# either the machine name ("fines") or the russian label ("штрафы").
_LABEL_TO_KEY: dict[str, str] = {**{k: k for k in DATA_CATEGORIES}}
for k, v in PROVIDER_LABELS.items():
    _LABEL_TO_KEY[v.lower()] = k
# Also accept short aliases.
_LABEL_TO_KEY.update(
    {
        "пропуск": "passes",
        "дк": "diagnostic_card",
        "штрафы": "fines",
        "осаго": "osago",
        "рнис": "rnis",
        "платные": "avtodor",
    }
)


def _parse_category(token: str | None) -> str | None:
    if not token:
        return None
    return _LABEL_TO_KEY.get(token.strip().lower())


class BannerOffFSM(StatesGroup):
    waiting_confirm = State()


# --- /help -----------------------------------------------------------


@router.message(Command("help"))
@router.message(Command("start"))
async def cmd_help(message: Message) -> None:
    if not _is_admin(message.from_user.id if message.from_user else None):
        return
    # Bot default ParseMode is Markdown V1: `*`, `_`, `[…](…)`, backticks
    # are entity delimiters. The `_` in `diagnostic_card` and the `[…]`
    # square brackets in `[текст]` were both interpreted as unclosed
    # entities → Telegram returned `Bad Request: can't parse entities`
    # and the bot dropped every `/help` and `/start` from the admin.
    # Send this help with parse_mode=None so reserved chars pass through
    # literally; no formatting is needed for the help text anyway.
    await message.answer(
        "Бот мониторинга качества данных TransApp.\n\n"
        "Команды:\n"
        "• /issues — открытые жалобы\n"
        "• /banner_on <категория> [текст] — включить баннер вручную\n"
        "• /banner_off <категория> [текст] — выключить баннер + recovery push\n"
        "• /help — эта подсказка\n\n"
        "Категории: passes, diagnostic_card, fines, osago, rnis, avtodor "
        "(или по-русски: пропуска, ДК, штрафы, ОСАГО, РНИС, платные).",
        parse_mode=None,
    )


# --- /issues ---------------------------------------------------------


@router.message(Command("issues"))
async def cmd_issues(message: Message) -> None:
    if not _is_admin(message.from_user.id if message.from_user else None):
        return
    open_issues = await notice_svc.list_open_issues(limit=20)
    if not open_issues:
        await message.answer("Нет открытых жалоб ✅")
        return
    lines = [f"📋 Открытых жалоб: {len(open_issues)}"]
    for it in open_issues:
        label = PROVIDER_LABELS.get(it.category, it.category)
        ts = it.created_at.strftime("%H:%M %d.%m")
        line = f"• #{it.id} [{label}] {ts} user={it.user_id} auto={it.auto_id}"
        if it.comment:
            snippet = it.comment if len(it.comment) <= 80 else it.comment[:80] + "…"
            line += f"\n  {snippet}"
        lines.append(line)
    # Plain text — `[…]`, `_`, `*` in labels/comments would break Markdown
    # parsing (`Bad Request: can't parse entities`). The list view doesn't
    # need formatting; readability comes from the bullet/indentation.
    await message.answer("\n".join(lines), parse_mode=None)


# --- /banner_on ------------------------------------------------------


@router.message(Command("banner_on"))
async def cmd_banner_on(message: Message, command: CommandObject) -> None:
    if not _is_admin(message.from_user.id if message.from_user else None):
        return
    if not command.args:
        await message.answer(
            "Использование: /banner_on <категория> [текст сообщения]\n"
            "Например: /banner_on штрафы Сейчас могут быть перебои с штрафами"
        )
        return
    parts = command.args.split(maxsplit=1)
    category = _parse_category(parts[0])
    if category is None:
        await message.answer(
            f"Неизвестная категория «{parts[0]}». Доступные: "
            + ", ".join(DATA_CATEGORIES)
        )
        return
    custom_text = parts[1].strip() if len(parts) > 1 else None
    text = custom_text or _default_banner_message(category)

    try:
        notice = await notice_svc.activate_admin_notice(category, text)
    except IntegrityError:
        existing = await notice_svc.get_active_for_category(category)
        existing_id = existing.id if existing else "?"
        await message.answer(
            f"⚠️ Баннер для категории *{PROVIDER_LABELS.get(category, category)}* "
            f"уже активен (notice #{existing_id}). Сначала /banner_off, потом /banner_on."
        )
        return

    label = PROVIDER_LABELS.get(category, category)
    # Plain text — admin-supplied `text` may contain `_ * [` etc which
    # break Markdown V1 entity parsing (`Bad Request: can't parse
    # entities`). The label is a fixed Russian word so newline+colon
    # gives enough visual separation without bold.
    await message.answer(
        f"🟡 Баннер активирован: {label} (notice #{notice.id})\nТекст: {text}",
        parse_mode=None,
    )


def _default_banner_message(category: str) -> str:
    label = PROVIDER_LABELS.get(category, category)
    return (
        f"⚠️ Возможны временные перебои в данных по категории «{label}». "
        f"Мы уже работаем над этим."
    )


# --- /banner_off (with confirm) --------------------------------------


@router.message(Command("banner_off"))
async def cmd_banner_off(
    message: Message, command: CommandObject, state: FSMContext
) -> None:
    if not _is_admin(message.from_user.id if message.from_user else None):
        return
    if not command.args:
        await message.answer(
            "Использование: /banner_off <категория> [текст recovery push]"
        )
        return
    parts = command.args.split(maxsplit=1)
    category = _parse_category(parts[0])
    if category is None:
        await message.answer(
            f"Неизвестная категория «{parts[0]}». Доступные: "
            + ", ".join(DATA_CATEGORIES)
        )
        return
    custom_body = parts[1].strip() if len(parts) > 1 else None

    notice = await notice_svc.get_active_for_category(category)
    if notice is None:
        await message.answer(
            f"Для категории *{PROVIDER_LABELS.get(category, category)}* "
            "нет активного баннера — нечего выключать."
        )
        return

    # Count complainants with FCM tokens to show realistic recipient count.
    complainants = await DataIssue.filter(
        category=category, fcm_token__isnull=False
    ).values_list("fcm_token", flat=True)
    distinct_tokens = len({t for t in complainants if t})

    await state.set_state(BannerOffFSM.waiting_confirm)
    await state.update_data(category=category, custom_body=custom_body)

    label = PROVIDER_LABELS.get(category, category)
    confirm_text = (
        f"Выключить баннер *{label}* (notice #{notice.id})?\n\n"
        f"Recovery push будет отправлен *{distinct_tokens}* жалобщику(ам)."
    )
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=f"✅ Выключить + push ({distinct_tokens})",
                    callback_data="banner_off_confirm:with_push",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🔕 Только выключить",
                    callback_data="banner_off_confirm:no_push",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="❌ Отмена",
                    callback_data="banner_off_confirm:cancel",
                ),
            ],
        ]
    )
    await message.answer(confirm_text, reply_markup=keyboard)


@router.callback_query(
    StateFilter(BannerOffFSM.waiting_confirm),
    F.data.startswith("banner_off_confirm:"),
)
async def cb_banner_off_confirm(call: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(call.from_user.id if call.from_user else None):
        await call.answer("Не разрешено.", show_alert=True)
        return
    action = (call.data or "").split(":", 1)[1]
    data = await state.get_data()
    category: str = data.get("category", "")
    custom_body: str | None = data.get("custom_body")
    await state.clear()

    if action == "cancel":
        await call.message.edit_text("Отменено.") if call.message else None
        await call.answer()
        return
    send_push = action == "with_push"

    result = await notice_svc.deactivate_with_recovery_push(
        category, send_push=send_push, custom_body=custom_body
    )
    if result is None:
        await (
            call.message.edit_text(
                f"Баннер для *{PROVIDER_LABELS.get(category, category)}* "
                "уже не активен."
            )
            if call.message
            else None
        )
        await call.answer()
        return

    label = PROVIDER_LABELS.get(category, category)
    if send_push:
        msg = (
            f"✅ Баннер *{label}* выключен (notice #{result.notice_id}).\n"
            f"Push отправлен: *{result.push_recipient_count}* (success "
            f"*{result.push_success_count}*, failure *{result.push_failure_count}*)."
        )
    else:
        msg = (
            f"✅ Баннер *{label}* выключен (notice #{result.notice_id}). "
            f"Push не отправлялся."
        )
    if call.message:
        await call.message.edit_text(msg)
    await call.answer()


# --- callbacks from per-issue notification ---------------------------


@router.callback_query(F.data.startswith("banner_on:"))
async def cb_banner_on_inline(call: CallbackQuery) -> None:
    """Inline button on the per-issue alert: activate banner with default text."""
    if not _is_admin(call.from_user.id if call.from_user else None):
        await call.answer("Не разрешено.", show_alert=True)
        return
    parts = (call.data or "").split(":")
    if len(parts) < 2:
        await call.answer()
        return
    category = parts[1]
    if category not in DATA_CATEGORIES:
        await call.answer("Неизвестная категория.", show_alert=True)
        return
    text = _default_banner_message(category)
    try:
        notice = await notice_svc.activate_admin_notice(category, text)
    except IntegrityError:
        await call.answer("Баннер уже активен.", show_alert=True)
        return
    await call.answer("Баннер активирован.")
    label = PROVIDER_LABELS.get(category, category)
    if call.message:
        try:
            await call.message.reply(
                f"🟡 Баннер активирован: *{label}* (notice #{notice.id})"
            )
        except TelegramBadRequest:
            pass


@router.callback_query(F.data.startswith("resolve_issue:"))
async def cb_resolve_issue(call: CallbackQuery) -> None:
    if not _is_admin(call.from_user.id if call.from_user else None):
        await call.answer("Не разрешено.", show_alert=True)
        return
    parts = (call.data or "").split(":")
    try:
        issue_id = int(parts[1])
    except (IndexError, ValueError):
        await call.answer()
        return
    closed = await notice_svc.resolve_issue(issue_id)
    if closed:
        await call.answer("Жалоба закрыта.")
        if call.message:
            try:
                await call.message.reply(f"✅ Жалоба #{issue_id} закрыта.")
            except TelegramBadRequest:
                pass
    else:
        await call.answer("Жалоба уже закрыта или не найдена.", show_alert=True)


def build_dispatcher() -> Dispatcher:
    """Factory: build a Dispatcher with FSM storage and the admin router."""
    from aiogram.fsm.storage.memory import MemoryStorage

    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    return dp


def build_bot() -> Bot:
    """Factory: build the inbound Bot. Caller is responsible for closing
    bot.session at shutdown."""
    from aiogram.client.default import DefaultBotProperties
    from aiogram.enums import ParseMode

    return Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN),
    )
