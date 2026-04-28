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

## See also

- `infra-deployment.md` — production COI VM pipeline, GitHub secrets, DNS,
  first-deploy plan, gap analysis vs `tradesu-moderator`
- `dev-backend.md` — payment-service codebase conventions (Litestar, Tortoise)
- `dev-database.md` — schema, migrations
