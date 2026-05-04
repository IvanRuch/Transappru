"""
Entrypoint for the `payment-bot` sidecar container:
    python -m app.bot.bot_worker

Runs the aiogram dispatcher in long-poll mode against the Telegram API.
Does NOT serve any HTTP endpoints — payment-service handles those.
Both processes share the same Postgres database (Tortoise ORM) and the
same source tree (single Docker image, two `command:` entries in
docker-compose).

Lifecycle:
  1. init Tortoise (so handlers can read/write models)
  2. (best-effort) init firebase-admin via the shared service module —
     pre-warmed to the recovery-push path
  3. drop any pending webhook so polling has a clean slate
  4. start_polling() — blocks until Ctrl-C / container stop
  5. teardown: close bot session, close DB connections
"""

from __future__ import annotations

import asyncio
import logging
import sys

from app.bot.handlers import build_bot, build_dispatcher
from app.bot.poll_alerts import poll_for_new_alerts
from app.config.db import close_db, init_db
from app.config.settings import settings
from app.services import firebase_push

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("payment-bot")


async def _run() -> None:
    if not settings.TELEGRAM_BOT_TOKEN or settings.TELEGRAM_ADMIN_CHAT_ID == 0:
        logger.error(
            "TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID not configured — "
            "bot worker will exit immediately. Set them in payment-service/.env "
            "and restart the container."
        )
        return

    await init_db()
    # Pre-warm FCM init so the first /banner_off doesn't pay the load cost.
    if firebase_push.is_available():
        logger.info("firebase_push.ready: recovery push will be sent on /banner_off")
    else:
        logger.warning(
            "firebase_push.unavailable: /banner_off will degrade gracefully "
            "(banner deactivates, push skipped)"
        )

    bot = build_bot()
    dp = build_dispatcher()
    try:
        # Drop pending webhook (if any was set previously) and any
        # buffered updates so we don't process stale alerts on restart.
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info(
            "payment-bot.start admin_chat_id=%d", settings.TELEGRAM_ADMIN_CHAT_ID
        )
        # Run two concurrent long-running tasks:
        #   1. dp.start_polling — inbound Telegram updates (commands +
        #      inline-callback queries from the admin).
        #   2. poll_for_new_alerts — outbound: poll `data_issues` every
        #      few seconds and dispatch admin alerts for new rows.
        # See ADR-015: we own the only VPN-routed namespace in the
        # cluster (network_mode: "service:vpn"), so the bot is the
        # single source of truth for outbound TG traffic.
        await asyncio.gather(
            dp.start_polling(bot, handle_signals=True),
            poll_for_new_alerts(bot),
        )
    finally:
        await bot.session.close()
        await close_db()
        logger.info("payment-bot.stop")


def main() -> None:
    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        logger.info("payment-bot.interrupt")
        sys.exit(0)


if __name__ == "__main__":
    main()
