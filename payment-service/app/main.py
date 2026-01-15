from litestar import Litestar, Request, Response
from litestar.config.cors import CORSConfig
from litestar.exceptions import ValidationException
from litestar.status_codes import HTTP_400_BAD_REQUEST
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from app.config.db import init_db, close_db
from app.controllers.payment import PaymentController
from app.config.settings import settings

# Настройка логгера
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройка CORS
cors_config = CORSConfig(allow_origins=["*"])

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

def validation_exception_handler(request: Request, exc: ValidationException) -> Response:
    """
    Логируем ошибки валидации Pydantic.
    """
    logger.error(f"Validation failed for {request.method} {request.url.path}: {exc.detail} - {exc.extra}")
    return Response(
        content={
            "status_code": HTTP_400_BAD_REQUEST,
            "detail": exc.detail,
            "extra": exc.extra,
        },
        status_code=HTTP_400_BAD_REQUEST,
    )

app = Litestar(
    route_handlers=[PaymentController],
    lifespan=[db_lifespan],
    cors_config=cors_config,
    debug=settings.DEBUG,
    exception_handlers={ValidationException: validation_exception_handler},
)
