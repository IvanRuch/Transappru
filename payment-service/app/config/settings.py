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
    KAZNA_SECRET_KEY: str = "SA9QXHKV"  # Тестовый ключ
    KAZNA_TOKEN: str = "testservice"  # Тестовый токен
    KAZNA_PARTNER_ID: str = "test_partner"

    # Telegram bot — admin alerts + manual banner control.
    # Empty token / zero chat_id → bot integration is silently skipped
    # (used in tests and local dev without telegram credentials).
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: int = 0

    # Firebase Admin SDK — server-side FCM for recovery push.
    # If file is missing at startup, FCM is marked unavailable; data-issues
    # endpoints still work, recovery push is simply skipped (graceful degrade).
    FIREBASE_CREDENTIALS_PATH: str = "/run/secrets/firebase-server-account.json"

    # Auto-banner threshold: ≥ THRESHOLD distinct user_ids per category
    # within WINDOW_HOURS triggers an automatic system_notice (source='auto').
    AUTO_BANNER_ENABLED: bool = True
    AUTO_BANNER_THRESHOLD: int = 3
    AUTO_BANNER_WINDOW_HOURS: int = 6


settings = Settings()
