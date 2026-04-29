"""
Health check endpoints for orchestrator probes (Docker HEALTHCHECK,
Kubernetes liveness/readiness, Yandex Cloud Monitoring uptime checks).

Mounted at root (no `/api/` prefix) so container HEALTHCHECK and
external monitors hit a stable, dependency-free path that does not
collide with the application's API surface.

Liveness (`/health`):
    Process is alive and the event loop responds. Intentionally has
    NO database/network dependencies — if liveness depended on DB,
    a transient DB outage would trigger container restart, which
    cannot fix a DB outage and only makes recovery slower.

Readiness (`/health/ready`):
    Process is ready to accept traffic — verifies DB connectivity.
    Use this in load-balancer probes (k8s readinessProbe, YC
    application load balancer) to drain a pod when the DB connection
    is lost without killing the pod.
"""

from typing import Dict

from litestar import Controller, get
from litestar.exceptions import HTTPException
from tortoise import Tortoise


class HealthController(Controller):
    path = ""

    @get("/health", sync_to_thread=False)
    def liveness(self) -> Dict[str, str]:
        """Liveness probe — returns 200 if the event loop is responsive."""
        return {"status": "ok"}

    @get("/health/ready")
    async def readiness(self) -> Dict[str, str]:
        """Readiness probe — returns 200 only if DB connection answers,
        503 otherwise so a load balancer can drain the pod cleanly."""
        try:
            connection = Tortoise.get_connection("default")
            await connection.execute_query("SELECT 1")
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=503,
                detail=f"db_unavailable: {type(exc).__name__}",
            ) from exc
        return {"status": "ok"}
