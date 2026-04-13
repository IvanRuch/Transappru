# Backend Development

<!-- Payment service development guide -->

## Stack

Litestar + Tortoise ORM + PostgreSQL 15.

See `payment-service/CLAUDE.md` for coding conventions.

## Running Locally

```bash
cd payment-service
docker compose up
```

## Testing

```bash
docker compose run --rm payment-service pytest -x --tb=short
```

## Migrations

```bash
docker compose exec payment-service aerich migrate
docker compose exec payment-service aerich upgrade
```
