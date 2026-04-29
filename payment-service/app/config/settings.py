from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    DEBUG: bool = False
    SECRET_KEY: str = "unsafe-secret-key-change-me"

    # Database
    DB_URL: str = "postgres://postgres:postgres@localhost:5432/transapp_db"

    # Kazna API
    KAZNA_API_URL: str = "https://demopay.oplatagosuslug.ru/api/kazna/2.2"
    KAZNA_SECRET_KEY: str = "SA9QXHKV" # Тестовый ключ
    KAZNA_TOKEN: str = "testservice" # Тестовый токен
    KAZNA_PARTNER_ID: str = "test_partner"

settings = Settings()
