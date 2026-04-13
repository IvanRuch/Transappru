# Payment Database Schema Guide

Source of truth: `payment-service/app/models.py` (Tortoise ORM models).

## Tables

### payment_transactions

Main payment records.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| created_at | datetime | Auto (add) |
| updated_at | datetime | Auto (update) |
| amount | Decimal(10,2) | Payment total |
| description | Text | Nullable |
| kazna_payment_id | CharField(100) | Nullable, indexed — Kazna's ID |
| kazna_status | CharField(50) | Default: "created" |
| uin | Text | Comma-separated UIN list |
| uin_count | Int | Default: 1 |

### payment_transaction_items

Per-UIN items in multi-payment (FK → payment_transactions).

| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | Auto-increment |
| transaction | FK → payment_transactions | CASCADE delete |
| uin | CharField(50) | Indexed |
| amount | Decimal(10,2) | Individual item amount |
| status | CharField(50) | pending / paid / failed / cancelled |
| paid_at | datetime | Nullable — when Kazna confirmed |
| created_at | datetime | Auto (add) |
| updated_at | datetime | Auto (update) |

### commission_rates

Commission tariffs with validity periods.

| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | Auto-increment |
| service_type | CharField(50) | Service category |
| valid_from | datetime | Auto (add) |
| valid_to | datetime | Nullable — null = currently active |
| kazna_percent | Decimal(5,2) | Kazna's commission % |
| kazna_min_amount | Int | Minimum Kazna fee |
| transapp_percent | Decimal(5,2) | TransApp commission % |
| transapp_min_amount | Int | Minimum TransApp fee |
| created_at | datetime | Auto (add) |

Composite index: `(service_type, valid_to)`

## FK Chain

```
payment_transactions.id ← payment_transaction_items.transaction_id
```

## Docker DB Access

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5433 (mapped from container 5432) |
| Database | payment_db |
| User | postgres |
| Password | postgres |

## Kazna Payment Lifecycle

```
created → pending → auth → paid
                         → cancel
                         → error
```

## Business Rules

- Amounts in kopecks for Kazna API (multiply by 100 server-side)
- Commission = kazna_percent + transapp_percent (0.1%)
- Multi-payment: one `payment_transactions` row + N `payment_transaction_items` rows

## Migrations (Aerich)

```bash
# Create migration after model changes
docker compose exec payment-service aerich migrate

# Apply pending migrations
docker compose exec payment-service aerich upgrade

# Check migration status
docker compose exec payment-service aerich heads
```

Config in `pyproject.toml`: `tortoise_orm = "app.config.db.TORTOISE_ORM"`

## TDD for Write Operations

1. Write test first (pytest-asyncio)
2. Wrap writes in transactions
3. Verify with `SELECT` after write, not by re-calling endpoint
