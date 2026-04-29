import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from litestar import Litestar, Request, Response
from litestar.config.cors import CORSConfig
from litestar.exceptions import ValidationException
from litestar.openapi.config import OpenAPIConfig
from litestar.openapi.plugins import ScalarRenderPlugin, SwaggerRenderPlugin
from litestar.status_codes import HTTP_400_BAD_REQUEST

from app.config.db import close_db, init_db
from app.config.settings import settings
from app.controllers.health import HealthController
from app.controllers.payment import PaymentController

# Настройка логгера
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройка CORS
cors_config = CORSConfig(allow_origins=["*"])

# OpenAPI auto-docs.
# Mounted under /api/schema so it travels symmetrically through the same
# nginx /payment-api/ → /api/ rewrite as the rest of the API surface.
# Public access (after deploy):
#   - https://transapp-dev.ru/payment-api/schema             (HTML index)
#   - https://transapp-dev.ru/payment-api/schema/openapi.json (raw spec)
#   - https://transapp-dev.ru/payment-api/schema/swagger     (Swagger UI)
#   - https://transapp-dev.ru/payment-api/schema/scalar      (Scalar UI)
openapi_config = OpenAPIConfig(
    title="TransApp Payment Service",
    version="0.1.0",
    description=(
        "Internal payment service integrating with Kazna API. "
        "See https://tprs.ru/KaznaAPI.pdf for the upstream contract; "
        "see Writerside topics api-payment.md and dev-payment-flow.md "
        "for our integration semantics (notify vs subscribeNotify "
        "channels, polling-based status, ADR-008)."
    ),
    path="/api/schema",
    render_plugins=[SwaggerRenderPlugin(), ScalarRenderPlugin()],
)


@asynccontextmanager
async def db_lifespan(app: Litestar) -> AsyncGenerator[None, None]:
    """
    Управление жизненным циклом базы данных.
    """
    await init_db()
    try:
        yield
    finally:
        await close_db()


def validation_exception_handler(
    request: Request, exc: ValidationException
) -> Response:
    """
    Логируем ошибки валидации Pydantic.
    """
    logger.error(
        f"Validation failed for {request.method} {request.url.path}: {exc.detail} - {exc.extra}"
    )
    return Response(
        content={
            "status_code": HTTP_400_BAD_REQUEST,
            "detail": exc.detail,
            "extra": exc.extra,
        },
        status_code=HTTP_400_BAD_REQUEST,
    )


app = Litestar(
    route_handlers=[HealthController, PaymentController],
    lifespan=[db_lifespan],
    cors_config=cors_config,
    openapi_config=openapi_config,
    debug=settings.DEBUG,
    exception_handlers={ValidationException: validation_exception_handler},
)
