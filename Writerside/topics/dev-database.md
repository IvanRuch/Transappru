# Database Schema

See `.claude/skills/payment-db.md` for full schema reference.

## Tables

- `payment_transactions` — main payment records
- `payment_transaction_items` — per-UIN items
- `commission_rates` — commission tariffs

## Connection

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5433 |
| Database | payment_db |
| User | postgres |
| Password | postgres |
