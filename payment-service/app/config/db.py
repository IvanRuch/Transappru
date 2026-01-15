from tortoise import Tortoise
from app.config.settings import settings

TORTOISE_ORM = {
    "connections": {"default": settings.DB_URL},
    "apps": {
        "models": {
            "models": ["app.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}

async def init_db() -> None:
    await Tortoise.init(config=TORTOISE_ORM)
    # В режиме разработки генерируем схемы автоматически
    await Tortoise.generate_schemas()

async def close_db() -> None:
    await Tortoise.close_connections()
