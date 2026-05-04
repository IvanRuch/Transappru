# Docker — Local Development

> **Scope:** developer-laptop usage only. Production deployment is a separate
> stack (Yandex Cloud COI VM + GitHub Actions) — see `infra-deployment.md`.

## Services

`payment-service/docker-compose.yml` runs two containers locally:

```yaml
services:
  payment-service:  # port 8001 → 8000
  payment-db:       # port 5433 → 5432 (PostgreSQL 15)
```

This compose file is **not** the one used in production. Production uses the
templated `yandex-cloud/docker-compose.yc.yaml`, which adds an nginx service
and is rendered with secrets at deploy time by `yc-actions/yc-coi-deploy@v2`.

## Commands

```bash
cd payment-service

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps

# Rebuild after changes
docker compose up --build

# Run migrations
docker compose exec payment-service aerich upgrade
```

## Port Mapping

| Service | Host Port | Container Port |
|---------|-----------|----------------|
| Payment API | 8001 | 8000 |
| PostgreSQL | 5433 | 5432 |

## Cleanup — освобождение места на диске

Локально параллельно работают два проекта (`payment-service` и
`tradesu-moderator`), плюс `transapp-web-test`. Образы, build cache и
остановленные контейнеры быстро накапливаются — Docker Desktop легко
съедает 15–20 GB.

### Диагностика

```bash
docker system df                    # сводка: images / containers / volumes / build cache
docker images                        # список образов с тегами
docker ps -a                         # все контейнеры (включая остановленные)
docker volume ls                     # тома
docker images -a -f "dangling=true"  # «осиротевшие» слои от пересборок
```

### Безопасная чистка (раз в 1–2 недели)

Возвращает 5–10 GB, ничего не ломает. Активные данные в volumes остаются
нетронутыми.

```bash
docker container prune -f                              # удалить остановленные контейнеры
docker image prune -f                                  # удалить dangling образы (без тегов)
docker builder prune --filter "until=168h" -f          # build cache старше 7 дней
docker system df                                       # проверить результат
```

Одной строкой:

```bash
docker container prune -f && docker image prune -f && docker builder prune --filter "until=168h" -f && docker system df
```

### Агрессивная чистка (когда место кончается)

> ⚠️ После этого следующие `docker compose build` будут медленными —
> кэша нет, всё качается/собирается заново.

```bash
docker image prune -a -f             # удалит все образы без запущенных контейнеров
docker builder prune -a -f           # ВЕСЬ build cache
```

### Volumes — ⚠️ ОПАСНО

В томах лежат БД и файлы. Если `tradesu-moderator` остановлен (нет запущенных
контейнеров), его volumes числятся как «неиспользуемые» и
`docker volume prune` их **снесёт** вместе с данными.

```bash
docker volume ls                     # сначала посмотреть что есть
# НЕ запускать docker volume prune без проверки!
```

Перед удалением — бэкап:

```bash
docker run --rm \
  -v tradesu-moderator_pg_data:/data \
  -v $PWD:/backup \
  alpine tar czf /backup/tradesu_pg_$(date +%F).tar.gz -C /data .
```

Сохраняемые volumes проекта (НЕ удалять):

| Volume | Что внутри |
|---|---|
| `payment-service_payment_postgres_data` | БД payment-service |
| `tradesu-moderator_pg_data` | PostgreSQL moderator |
| `tradesu-moderator_mysql_data` | MySQL/MariaDB moderator |
| `tradesu-moderator_redis_data` | Redis moderator |
| `tradesu-moderator_service_files` | Файлы moderator |
| `tradesu-moderator_profitability_files` | Отчёты moderator |
| `tradesu-moderator_feedback_screenshots` | Скриншоты обратной связи |
| `club-postgres-data*`, `supabase_db-config` | Внешние проекты |

### После чистки контейнеров `tradesu-moderator`

Если удалили остановленные контейнеры moderator — не страшно. При следующем
запуске `docker compose up -d` в его папке контейнеры пересоздадутся и
автоматически прицепятся к существующим volumes. Данные не пострадают.

### Что НЕ чистить

- Активные образы (`payment-service-payment-service`, `postgres:15-alpine`
  для запущенного payment-db) — `docker image prune` их не тронет, но
  `docker image prune -a` снесёт, если контейнер остановлен.
- Volumes без явной проверки.
- Build cache, если планируется пересборка в ближайшие дни (потеряете время).

## See also

- `infra-deployment.md` — production COI VM pipeline, GitHub secrets, DNS,
  first-deploy plan, gap analysis vs `tradesu-moderator`
- `dev-backend.md` — payment-service codebase conventions (Litestar, Tortoise)
- `dev-database.md` — schema, migrations
