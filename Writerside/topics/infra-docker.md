# Docker Infrastructure

## Services

Payment service runs via Docker Compose:

```yaml
# payment-service/docker-compose.yml
services:
  payment-service:  # port 8001 → 8000
  payment-db:       # port 5433 → 5432 (PostgreSQL 15)
```

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
