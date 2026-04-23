# Payment Service — Development Rules

## Stack

Litestar (Python 3.9+) + Tortoise ORM (async) + PostgreSQL 15.
Migrations: Aerich. Validation: Pydantic v2. HTTP client: httpx.

## Project Structure

- `app/main.py` — Litestar entry point, CORS, lifespan
- `app/models.py` — Tortoise ORM models (PaymentTransaction, PaymentTransactionItem, CommissionRate)
- `app/controllers/payment.py` — PaymentController (REST endpoints)
- `app/services/kazna.py` — KaznaService (Kazna API integration, request signing)
- `app/services/commission.py` — CommissionService (fee calculation)
- `app/config/settings.py` — Pydantic BaseSettings (.env loading)
- `app/config/db.py` — Tortoise ORM init/close

## Docker

- `docker-compose.yml`: services payment-service (:8001) + payment-db (:5433)
- Dev: `docker compose up` (hot-reload via volume mount + `--reload`)
- DB: PostgreSQL 15-alpine, user=postgres, db=payment_db

## Database Models (3 tables)

See `.claude/skills/payment-db.md` for full schema reference.

- `payment_transactions` — main payment records (UUID pk, amount, UIN, kazna_status)
- `payment_transaction_items` — per-UIN items in multi-payment (FK → transaction)
- `commission_rates` — commission tariffs with validity periods

## API Endpoints

- `POST /api/init-payment` — single fine payment
- `POST /api/init-multi-payment` — multi-UIN payment
- `POST /api/calculate-commission` — commission preview
- `POST /api/calculate-multi-commission` — multi-item commission
- `GET /api/payment-status/{id}` — check payment status
- `POST /api/notify` — Kazna webhook callback

## Business Rules

- Secrets (KAZNA_SECRET_KEY, KAZNA_TOKEN) — ONLY in `.env`, never in code (see root `.claude/rules.md` Payment Security)
- Commission = kazna_percent + transapp_percent (0.1%)
- Amounts converted to kopecks server-side (×100)
- Amounts MUST be validated server-side — never trust client-supplied values
- Kazna API: request signing via `cryptography` library

## Transactions & Error Handling (writes)

For any endpoint that performs INSERT/UPDATE/DELETE on `payment_db`:

- Wrap DB writes in `async with in_transaction():` (Tortoise) — rollback on any error
- Validate input with Pydantic v2 model BEFORE touching the DB
- On Kazna API failure, persist the attempt with `kazna_status="failed"` + reason — never leave a silent hole
- Surface user-facing errors via Litestar `HTTPException(status_code, detail)` — do not leak stack traces
- Return deterministic status codes: `400` invalid input, `402` payment declined, `409` duplicate UIN, `500` Kazna/DB errors
- Log with structured fields (transaction_id, uin, status) — avoid f-string logs without context

Write-operation TDD rule (from root CLAUDE.md): test first, then implement.

## Testing

```bash
docker compose run --rm payment-service pytest -x --tb=short $ARGUMENTS
```

## Linting

- ruff (configured via `ruff.toml`)
- mypy for type checking

## Migrations

```bash
docker compose exec payment-service aerich migrate    # create migration
docker compose exec payment-service aerich upgrade    # apply migration
```

## Corrections (from user feedback)
