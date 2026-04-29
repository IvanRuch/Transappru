"""
Shared pytest fixtures for payment-service tests.

Tests run against an in-memory SQLite via Tortoise ORM, isolated per-test —
no shared state with the dev Postgres container, no migrations needed
(schemas are generated fresh via `Tortoise.generate_schemas`).

The HTTP client is built around a slimmed-down Litestar app (just the
PaymentController) without the production lifespan, because we manage DB
init/teardown ourselves via the `initialized_db` fixture.
"""

from typing import AsyncIterator

import pytest_asyncio
from litestar import Litestar
from litestar.testing import AsyncTestClient
from tortoise import Tortoise

from app.controllers.payment import PaymentController

# In-memory SQLite — fresh DB per test, automatic teardown.
TEST_DB_URL = "sqlite://:memory:"


@pytest_asyncio.fixture
async def initialized_db() -> AsyncIterator[None]:
    """Spin up an in-memory SQLite via Tortoise, generate schemas, teardown after test."""
    await Tortoise.init(
        db_url=TEST_DB_URL,
        modules={"models": ["app.models"]},
    )
    await Tortoise.generate_schemas()
    try:
        yield
    finally:
        await Tortoise.close_connections()


@pytest_asyncio.fixture
async def client(initialized_db: None) -> AsyncIterator[AsyncTestClient]:
    """Async HTTP test client for a stripped Litestar app (no production lifespan)."""
    app = Litestar(route_handlers=[PaymentController])
    async with AsyncTestClient(app=app) as test_client:
        yield test_client
