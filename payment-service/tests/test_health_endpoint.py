"""
Tests for the /health (liveness) and /health/ready (readiness) endpoints.

The container's HEALTHCHECK in Dockerfile.prod hits `/health` directly
on the upstream port 8000 (bypassing nginx), so this endpoint MUST stay
mounted at root and MUST NOT depend on the database — see the docstring
in `app/controllers/health.py` for the rationale.

Readiness checks DB connectivity by issuing `SELECT 1`; under the
in-memory SQLite test fixture this always succeeds, so we cover the
happy path here. The 503 branch is exercised by code review of the
controller (failure path is short and obvious).
"""

from typing import AsyncIterator

import pytest_asyncio
from litestar import Litestar
from litestar.testing import AsyncTestClient
from tortoise import Tortoise

from app.controllers.health import HealthController


@pytest_asyncio.fixture
async def liveness_client() -> AsyncIterator[AsyncTestClient]:
    """Slim app with only HealthController, NO DB init.

    Proves liveness has no DB dependency: if it tried to touch the ORM,
    Tortoise would raise because no connection is configured.
    """
    app = Litestar(route_handlers=[HealthController])
    async with AsyncTestClient(app=app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def readiness_client() -> AsyncIterator[AsyncTestClient]:
    """App with HealthController + initialized in-memory SQLite Tortoise.

    For exercising the readiness path that issues `SELECT 1` against
    the configured connection.
    """
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": ["app.models"]},
    )
    await Tortoise.generate_schemas()
    try:
        app = Litestar(route_handlers=[HealthController])
        async with AsyncTestClient(app=app) as test_client:
            yield test_client
    finally:
        await Tortoise.close_connections()


class TestLiveness:
    async def test_returns_ok(self, liveness_client) -> None:
        response = await liveness_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_does_not_require_db(self, liveness_client) -> None:
        # Liveness MUST NOT touch the DB. The fixture does NOT init
        # Tortoise; if the endpoint accidentally called the ORM, the
        # request would raise a "no connections" error.
        response = await liveness_client.get("/health")
        assert response.status_code == 200


class TestReadiness:
    async def test_with_db_returns_ok(self, readiness_client) -> None:
        response = await readiness_client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
