# Используем официальный легкий образ Python
FROM python:3.11-slim

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы зависимостей
COPY pyproject.toml README.md ./

# Устанавливаем зависимости (including dev extras for pytest in the container).
# This is the dev image (Dockerfile, used by docker-compose.yml). The prod
# image (Dockerfile.prod) deliberately stays slim and does not pull dev deps.
RUN pip install --upgrade pip && \
    pip install ".[dev]"

# Копируем код приложения (для продакшена)
COPY . .

# Открываем порт
EXPOSE 8000

# Команда запуска по умолчанию
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
