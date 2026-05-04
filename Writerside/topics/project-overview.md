# Project Overview

TransApp — мобильно-веб-сервис для управления транспортом, пропусками и
оплаты штрафов (ГИБДД / Платон / РНИС / ОСАГО / диагностические карты).
Изначально мобильное приложение под Android/iOS; с апреля 2026 — также
браузерная версия на staging (`transapp-dev.ru`), production cohabitation
с legacy web заблокирован на DNS-цикл (Phase 2 в `project-dashboard.md`).

## Stack

| Слой | Технологии |
|------|-----------|
| **Mobile** | React Native 0.81 + Expo SDK 54 + TypeScript 5.9 (strict) + Expo Router v6 (typed routes, React Compiler experiment включён) + NativeWind 4 |
| **Web** | Expo Web (тот же кодбейс, `.web.tsx` overrides), статически собирается и раздаётся через nginx |
| **Payment service** | Litestar + Tortoise ORM + PostgreSQL (отдельная БД per service, см. ADR-007) |
| **Push** | Firebase Cloud Messaging (FCM) — `@react-native-firebase/{app,messaging}` на native, `firebase` SDK на web |
| **Maps** | Yandex Maps JS API v3 на web (см. ADR-004, ADR-011), `react-native-yamap-plus` на native |
| **Infra** | Yandex Cloud COI VM, SSL через YC Certificate Manager, Container Registry `transapp-web` (см. ADR-002, ADR-006) |
| **CI/CD** | GitHub Actions: `deploy-web.yml` (web + payment-service в один pull), post-deploy curl smoke (`/health`, `/payment-api/schema`) |

## Architecture

```
   ┌─────────────────┐         ┌────────────────────┐         ┌──────────────┐
   │  Mobile App     │────────▶│  transapp.ru API    │         │  Kazna API   │
   │  (RN + Expo)    │         │  (legacy backend)   │         │  (payments)  │
   └────────┬────────┘         └────────────────────┘         └──────▲───────┘
            │                                                         │
            │                                                         │
   ┌────────▼────────┐         ┌────────────────────┐                │
   │  Web (Expo Web) │────────▶│  Payment Service    │────────────────┘
   │  transapp-dev.ru│         │  (Litestar + PG)    │
   └─────────────────┘         └────────────────────┘
```

- Mobile + Web ходят в **общий** legacy backend `transapp.ru/api/*` за
  основными бизнес-данными (auto-list, штрафы-list, пропуска, ОСАГО, …).
- Mobile + Web ходят в **наш** Payment Service `/payment-api/*` для
  инициации/проверки оплаты — он, в свою очередь, проксирует Kazna API.
- Phase 3 (см. `dev-payment-flow.md`) — payment-service возьмёт на себя
  push-каналы Kazna `notify` + `subscribeNotify`; пока legacy backend
  принимает `subscribeNotify` и шлёт пуши пользователям.

## Platforms

- **iOS** ≥ 15.1 (`expo-build-properties → ios.deploymentTarget = 15.1`)
- **Android** (Gradle 8.14.3 / AGP 8.13.2, JDK через JBR-21 — см. ADR-010)
- **Web** (Chrome / Safari / Firefox latest; Yandex Maps v3 CSP — см. ADR-011)

## Code layout

```
app/                Expo Router routes (mobile + web, .web.tsx overrides)
src/                RN code (components, hooks, screens, services, contexts)
payment-service/    Litestar microservice (Docker, отдельная Postgres БД)
  └── docs/vendor/  vendor docs (Kazna API spec PDF + контракт)
transappweb/        Legacy production web — к замене Expo Web
Transappru/         Legacy mobile (read-only архив прежнего проекта)
nginx/              Production nginx config + Dockerfile.prod
plugins/            Expo config plugins (~17 штук — см. dev-mobile.md)
scripts/            CLI helpers (setup, send-test-push, render-firebase-sw)
patches/            patch-package патчи node_modules (ADR-010, 10 пакетов)
Writerside/topics/  Documentation (single source of truth, ADR-012)
.claude/            AI config: rules, plans, skills, hooks
legacy/             Архив (DB-схема, миграционные docs)
```

## Что НЕ legacy

- `Transappru/` — read-only архив исходного проекта; не собирается, не правится.
- `transappweb/` — **production legacy web**, который сейчас отдаётся
  пользователям с `transapp.ru`. Будет заменён Expo Web после Phase 2
  cohabitation. До этого остаётся живым и не редактируется в этой репе
  без acute необходимости.

## Где что искать

| Тема | Topic |
|------|-------|
| Текущий статус проекта, backlog, recent changes | [project-dashboard.md](project-dashboard.md) |
| Архитектурные решения (ADR-001 … ADR-012) | [decision-log.md](decision-log.md) |
| Mobile development conventions, plugins, Android Studio setup | [dev-mobile.md](dev-mobile.md) |
| Web-specific: `.web.tsx` overrides, Form-on-Enter, Yandex Maps CSP | [dev-web.md](dev-web.md) |
| Expo Router routes / patterns | [dev-expo-router.md](dev-expo-router.md) |
| Screen development playbook (shared hooks/UI rules) | [dev-screen-conventions.md](dev-screen-conventions.md) |
| Payment Service: endpoint reference | [api-payment.md](api-payment.md) |
| Payment flow + Kazna integration | [dev-payment-flow.md](dev-payment-flow.md) |
| Backend code structure (Litestar) | [dev-backend.md](dev-backend.md) |
| Database schema (payment_db) | [dev-database.md](dev-database.md) |
| Push notifications (FCM, web push, payload contract) | [dev-push-notifications.md](dev-push-notifications.md) |
| Firebase config files и plugin layer | [infra-firebase.md](infra-firebase.md) |
| Deployment pipeline (Docker, YC, nginx, SSL) | [infra-deployment.md](infra-deployment.md) |
| EAS Build profiles, mobile release pipeline | [infra-eas-build.md](infra-eas-build.md) |
| Docker workflow, cleanup procedure | [infra-docker.md](infra-docker.md) |
| Manual QA checklist (F1…F11) | [manual-qa-checklist.md](manual-qa-checklist.md) |
| Setup guides (Mac M2 / Android / iOS) | [setup-mac-m2.md](setup-mac-m2.md), [setup-android.md](setup-android.md), [setup-ios.md](setup-ios.md) |
| Claude Code project setup (hooks, skills, rules) | [guide-claude-code-setup.md](guide-claude-code-setup.md) |
