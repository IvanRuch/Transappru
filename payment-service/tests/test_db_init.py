"""
Tests for `init_db()` — verifies that partial UNIQUE indexes from
`app/config/db.py:_PARTIAL_INDEXES_DDL` are created and actually enforced
at the database level (belt-and-suspenders to the app-level rate-limit
in `services/data_issues.py`).

Why this matters:
  - `Tortoise.generate_schemas()` does NOT generate partial UNIQUE INDEXes
    (it has no syntax for `WHERE` clauses). Without our DDL pass, the
    auto-banner threshold race-condition guard and the per-user
    rate-limit only exist in application code. Concurrent INSERTs from
    a single user could slip past, plant duplicate complaints, and
    inflate the auto-banner threshold count.
  - We rely on `IF NOT EXISTS` so this code is idempotent on every boot.

Tests use SQLite in-memory (per-test isolation, fast). SQLite has
supported `CREATE UNIQUE INDEX ... WHERE ...` since 3.8.0 (2014); the
behaviour mirrors Postgres for our purposes.
"""

from datetime import datetime, timezone
from typing import AsyncIterator

import pytest_asyncio
from tortoise import Tortoise

from app.config import db as db_module
from app.models import DataIssue, SystemNotice


@pytest_asyncio.fixture
async def initialized_via_init_db(monkeypatch) -> AsyncIterator[None]:
    """Spin up SQLite via `init_db()` so the partial-index DDL pass runs.

    Patches the DSN to in-memory SQLite (TORTOISE_ORM is captured at
    module load with whatever DB_URL the tests inherit, which can be the
    Postgres dev URL). This fixture rebuilds the config to point at SQLite.
    """
    test_config = {
        "connections": {"default": "sqlite://:memory:"},
        "apps": {
            "models": {
                "models": ["app.models"],
                "default_connection": "default",
            },
        },
    }
    monkeypatch.setattr(db_module, "TORTOISE_ORM", test_config)
    await db_module.init_db()
    try:
        yield
    finally:
        await db_module.close_db()


class TestPartialIndexesEnforce:
    async def test_data_issues_open_unique_blocks_second_open(
        self,
        initialized_via_init_db,
    ) -> None:
        """Second open complaint with same (user, auto, category) must
        raise IntegrityError at the DB level."""
        await DataIssue.create(user_id=1, auto_id=1, category="fines")

        from tortoise.exceptions import IntegrityError

        try:
            await DataIssue.create(user_id=1, auto_id=1, category="fines")
        except IntegrityError:
            pass
        else:
            raise AssertionError(
                "DB-level partial UNIQUE INDEX did not block duplicate open complaint",
            )

    async def test_data_issues_open_unique_allows_after_resolve(
        self,
        initialized_via_init_db,
    ) -> None:
        """After the first complaint is resolved, a new one with the
        same key is allowed (partial UNIQUE only covers `resolved_at IS NULL`)."""
        first = await DataIssue.create(user_id=2, auto_id=2, category="osago")
        first.resolved_at = datetime.now(timezone.utc)
        await first.save()
        second = await DataIssue.create(user_id=2, auto_id=2, category="osago")
        assert second.id != first.id

    async def test_data_issues_open_unique_allows_different_categories(
        self,
        initialized_via_init_db,
    ) -> None:
        """Two open complaints from the same user on the same auto but
        different categories MUST be allowed."""
        await DataIssue.create(user_id=3, auto_id=3, category="fines")
        await DataIssue.create(user_id=3, auto_id=3, category="osago")
        # No exception → ok.

    async def test_system_notice_active_unique_blocks_two_active(
        self,
        initialized_via_init_db,
    ) -> None:
        """Two active notices for the same category must be impossible."""
        await SystemNotice.create(category="fines", message="a", source="admin")

        from tortoise.exceptions import IntegrityError

        try:
            await SystemNotice.create(category="fines", message="b", source="auto")
        except IntegrityError:
            pass
        else:
            raise AssertionError(
                "DB-level partial UNIQUE INDEX did not block second active notice",
            )

    async def test_system_notice_active_unique_allows_after_deactivate(
        self,
        initialized_via_init_db,
    ) -> None:
        """After the first notice is deactivated, a new one for the same
        category is allowed."""
        first = await SystemNotice.create(
            category="passes",
            message="old",
            source="admin",
        )
        first.deactivated_at = datetime.now(timezone.utc)
        await first.save()
        second = await SystemNotice.create(
            category="passes",
            message="new",
            source="admin",
        )
        assert second.id != first.id


class TestIdempotency:
    async def test_init_db_can_run_twice(
        self,
        initialized_via_init_db,
    ) -> None:
        """Re-applying the DDL pass must be silent (`IF NOT EXISTS`).

        Simulates a container restart against an already-migrated DB.
        """
        await db_module._apply_partial_indexes()
        await db_module._apply_partial_indexes()
        # No exception → ok. (The fixture already called init_db once.)


class TestGracefulDegrade:
    async def test_apply_partial_indexes_without_initialised_orm(
        self,
        monkeypatch,
        caplog,
    ) -> None:
        """If Tortoise isn't initialised, the helper should log and
        return without raising — so a deploy doesn't get bricked by a
        transient connection issue."""
        # Make sure no connection exists.
        await Tortoise.close_connections()

        with caplog.at_level("ERROR"):
            await db_module._apply_partial_indexes()

        # Either logged ERROR (no default connection) or WARNING
        # (engine rejected DDL). Both are acceptable graceful-degrade
        # paths — the assertion is just "did not raise".
