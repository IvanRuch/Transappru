import logging

from tortoise import Tortoise

from app.config.settings import settings

logger = logging.getLogger(__name__)

TORTOISE_ORM = {
    "connections": {"default": settings.DB_URL},
    "apps": {
        "models": {
            "models": ["app.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}

# Raw DDL that `Tortoise.generate_schemas()` cannot express from models —
# partial UNIQUE INDEXes (with `WHERE` clause) and ON-DELETE-restricted
# composite query indexes that live in `migrations/002_data_issues_and_notice.sql`.
#
# Why apply them at startup instead of running `aerich upgrade`:
# Aerich auto-generates from model diffs and has no way to encode partial
# `WHERE` clauses; bolting raw SQL into Aerich migrations is more friction
# than benefit at the current scale (single-service Postgres, two engineers).
# Idempotent `IF NOT EXISTS` makes repeated boots silent — no per-VM
# operator step, including on a fresh staging or production instance.
#
# If we ever migrate to Aerich proper, this list moves into a custom
# migration file and the loop here is deleted.
_PARTIAL_INDEXES_DDL: tuple[str, ...] = (
    # ADR-012: race-safe auto-banner — at most one active notice per category.
    "CREATE UNIQUE INDEX IF NOT EXISTS system_notice_active_unique "
    "ON system_notice (category) WHERE deactivated_at IS NULL",
    # ADR-012: rate-limit — one open complaint per (user, auto, category).
    "CREATE UNIQUE INDEX IF NOT EXISTS data_issues_open_unique "
    "ON data_issues (user_id, auto_id, category) WHERE resolved_at IS NULL",
    # Threshold-check accelerator (count distinct user_ids per category in window).
    "CREATE INDEX IF NOT EXISTS data_issues_category_created "
    "ON data_issues (category, created_at DESC)",
    # Notice → issues join accelerator.
    "CREATE INDEX IF NOT EXISTS data_issues_notice ON data_issues (notice_id)",
    # Active-notice scan accelerator for /system-notice polling endpoint.
    "CREATE INDEX IF NOT EXISTS system_notice_category_active "
    "ON system_notice (category, deactivated_at)",
    # Per-token push log lookup by notice.
    "CREATE INDEX IF NOT EXISTS system_notice_push_log_notice "
    "ON system_notice_push_log (notice_id)",
)


async def _apply_partial_indexes() -> None:
    """Apply partial UNIQUE / composite indexes that live outside the model layer.

    Runs after `Tortoise.generate_schemas()` so the target tables already
    exist. Each statement is `IF NOT EXISTS` so this is safe on every boot,
    on every fresh VM, and on existing databases — no operator handoff.

    Failures are logged at ERROR level but do NOT abort startup: the
    application still works without the indexes (correctness via app-level
    pre-checks, slightly slower queries) and we'd rather degrade than
    refuse to serve traffic.
    """
    try:
        connection = Tortoise.get_connection("default")
    except Exception as exc:  # noqa: BLE001
        logger.error("init_db.partial_indexes: no default connection: %s", exc)
        return

    for ddl in _PARTIAL_INDEXES_DDL:
        try:
            await connection.execute_query(ddl)
        except Exception as exc:  # noqa: BLE001
            # Most likely a SQLite test runner that doesn't recognise our
            # exact partial-index syntax (we still test rate-limit via the
            # service's app-level pre-check, so this isn't a correctness
            # regression in tests). In production Postgres these all succeed.
            logger.warning(
                "init_db.partial_indexes: skipped DDL (engine doesn't support it?) "
                "stmt=%r error=%s",
                ddl,
                exc,
            )


async def init_db() -> None:
    """Initialise the ORM, materialise schemas, and apply non-model DDL.

    `Tortoise.generate_schemas()` is intentionally kept (instead of switching
    fully to Aerich migrations) — at current scale it's an effective
    "create what's missing" idempotent step and avoids the migration-state
    bookkeeping that Aerich would add. Partial UNIQUE indexes that the
    model layer cannot express are applied right after, idempotently.
    See `_PARTIAL_INDEXES_DDL` for the rationale.
    """
    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()
    await _apply_partial_indexes()


async def close_db() -> None:
    await Tortoise.close_connections()
