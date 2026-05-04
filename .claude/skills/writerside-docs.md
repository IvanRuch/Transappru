# Writerside Documentation Update Guide

## Rule

After EVERY successful code change, update relevant Writerside documentation.
Documentation is part of the task — not a separate step.

## Mapping: what changed → what to update

| Condition | File to update | Action |
|-----------|---------------|--------|
| Always | `Writerside/topics/project-dashboard.md` | Update progress, date |
| Payment endpoint added/changed | `Writerside/topics/api-payment.md` | Add/update endpoint docs |
| RN screen or component changed | `Writerside/topics/dev-mobile.md` | Document screen/component |
| Web changed | `Writerside/topics/dev-web.md` | Document changes |
| Architecture decision | `Writerside/topics/decision-log.md` | Add ADR-NNN entry |
| Feature flag added/changed | `Writerside/topics/dev-mobile.md` | Update feature flags section |
| Docker/infra changed | `Writerside/topics/infra-docker.md` | Update setup instructions |
| Firebase/push changed | `Writerside/topics/infra-firebase.md` | Update integration docs |
| Build/EAS config changed | `Writerside/topics/infra-eas-build.md` | Update build profiles |
| Expo Router routes changed | `Writerside/topics/dev-expo-router.md` | Update routing docs |

## ADR (Architecture Decision Record) Format

```markdown
### ADR-NNN: Title (YYYY-MM-DD)

**Context:** Why this decision was needed.
**Decision:** What we chose.
**Rationale:** Why this approach over alternatives.
**Consequences:** What changed, trade-offs.
```

## Status Emoji Legend

- ✅ Implemented and verified
- ⚠️ Partially implemented
- ❌ Not started
- 🔄 In progress

## Documentation locations (single source of truth)

Migration completed 2026-05-04 (see ADR-013 in `Writerside/topics/decision-log.md`).

| Where | What |
|-------|------|
| `Writerside/topics/` | All project documentation. **Single source of truth.** Edit here. |
| `payment-service/docs/vendor/kazna/` | Vendor docs (Kazna API spec PDF + markdown + contract). Read-only outside vendor updates. |
| `legacy/docs/` | Read-only archive of pre-2026-05-04 migration-era markdown. **Never edit.** Never link to from active docs. |

Root `README.md` is a slim index pointing into Writerside; do not duplicate
content there. `ARCHITECTURE.md`, `QUICK_START.md`, `TODO.md` no longer exist
in repo root — content lives in `Writerside/topics/project-overview.md`,
the new `README.md`, and `Writerside/topics/project-dashboard.md` (Next Tasks)
respectively.
