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

## Migration from /docs/

The 60+ markdown files in `/docs/` are the original project documentation.
They are being gradually migrated to `Writerside/topics/`.

Key migration mapping:

| Source in /docs/ | Target in Writerside/topics/ |
|-----------------|------------------------------|
| ARCHITECTURE.md | project-overview.md |
| EXPO_ROUTER_GUIDE.md | dev-expo-router.md |
| FINE_PAYMENT_INTEGRATION.md | dev-payment-flow.md |
| PUSH_NOTIFICATIONS.md | dev-push-notifications.md |
| FIREBASE_SETUP.md | infra-firebase.md |
| ANDROID_DEVICE_SETUP.md | setup-android.md |
| SETUP_MAC_M2.md | setup-mac-m2.md |
| WEB_ADAPTATION.md | dev-web.md |

When referencing old docs, check `/docs/` first but write new content to Writerside.
Do NOT delete `/docs/` files until migration is confirmed complete.
