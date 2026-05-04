# TransApp

Mobile + web сервис для управления транспортом, пропусками и оплаты
штрафов (ГИБДД / Платон / РНИС / ОСАГО / диагностические карты).

## Stack

- **Mobile:** React Native 0.81 + Expo SDK 54 + TypeScript (strict) + Expo Router v6 + NativeWind 4
- **Web:** Expo Web (тот же кодбейс, `.web.tsx` overrides) → static на nginx
- **Payment service:** Litestar + Tortoise ORM + PostgreSQL (Docker)
- **Infrastructure:** Yandex Cloud COI VM, SSL via Yandex Certificate Manager
- **Push:** Firebase Cloud Messaging (native + web)
- **Maps:** Yandex Maps JS API v3 (web), `react-native-yamap-plus` (native)

## Quick start

```bash
# Install + apply patch-package patches (ADR-010)
npm install

# Start payment service (Docker)
cd payment-service && docker compose up -d && cd ..

# Run web (http://localhost:8081)
npm run web

# Run iOS Simulator
npm run ios:17

# Run Android (emulator)
npm run android

# Run Android (physical device)
npm run android:device
```

Mac M2 первичная настройка: `bash scripts/setup-mac-m2.sh` →
[Writerside/topics/setup-mac-m2.md](Writerside/topics/setup-mac-m2.md).
Android Studio GUI Gradle setup (один раз на машину) —
[Writerside/topics/setup-android.md](Writerside/topics/setup-android.md).

## Documentation

Полная документация — в [Writerside](Writerside/topics/landing.md):

- [Project Dashboard](Writerside/topics/project-dashboard.md) — текущий статус, recent changes, backlog
- [Project Overview](Writerside/topics/project-overview.md) — архитектура и стек
- [Decision Log](Writerside/topics/decision-log.md) — все ADRs (001 … 013)
- [Manual QA Checklist](Writerside/topics/manual-qa-checklist.md) — F1 … F11

Vendor docs (Kazna API spec): `payment-service/docs/vendor/kazna/`.
Historical archive (миграция Nov 2025 – Apr 2026): `legacy/docs/`.

## AI development

Проект использует Claude Code. См. `CLAUDE.md` (project conventions),
`.claude/rules.md` (cross-cutting rules), `.claude/plans/` (активные планы).
Documentation Update Rule в `CLAUDE.md` — обязателен после каждого
кодового изменения.

## Repository layout

```
app/                Expo Router routes (mobile + web, .web.tsx overrides)
src/                RN code (components, hooks, screens, services, contexts)
payment-service/    Litestar payment microservice (+ vendor docs)
transappweb/        Legacy web (production, к замене Expo Web)
Transappru/         Legacy mobile archive (read-only)
nginx/              Production nginx config
plugins/            Expo config plugins
scripts/            CLI helpers
patches/            patch-package patches (ADR-010)
Writerside/topics/  Documentation (single source of truth, ADR-012)
.claude/            AI config: rules, plans, skills, hooks
legacy/             Архив (DB-схема, миграционные docs)
```

## License

Proprietary.
