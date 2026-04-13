# Project Rules (cross-cutting)

Rules learned from user feedback. Updated continuously.
Before adding a new rule — ASK the user for confirmation. Do NOT add silently.

## Where what lives

- **This file** (`.claude/rules.md`): cross-cutting rules — ALWAYS loaded
- `src/CLAUDE.md`: mobile app conventions — auto-loaded for src/ files
- `payment-service/CLAUDE.md`: backend conventions — auto-loaded for payment-service/ files
- `transappweb/CLAUDE.md`: web conventions — auto-loaded for transappweb/ files

Domain-specific corrections go into the corresponding subdirectory CLAUDE.md, not here.

## Platform-Specific Files

When editing a component/hook that has both `.ts` and `.web.ts` variants,
always check and update BOTH variants to maintain parity.
Pattern: `Foo.tsx` (native) + `Foo.web.tsx` (web) in the same directory.

## Payment Security

- NEVER hardcode Kazna API keys, tokens, or secrets in source code
- Secrets belong ONLY in `.env` files (which are gitignored)
- Payment amounts MUST be validated server-side (payment-service), never trust client values
- Always use HTTPS for production payment API URLs

## Docker Port Mapping

- Payment service API: localhost:8001 (container 8000)
- Payment DB (PostgreSQL): localhost:5433 (container 5432)
- Main app dev server: localhost:8081 (Expo)

## Corrections (accumulated)
