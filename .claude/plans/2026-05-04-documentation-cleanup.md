# Documentation Single-Source-of-Truth Closeout

## Context

`Writerside/topics/` — действующая, поддерживаемая документация (22 топика, 4473 строки, обновляется по mandate из `CLAUDE.md` после каждого изменения кода). Параллельно в проекте живёт «миграционная свалка» из 60 файлов в `/docs/` (в основном completion-логи, fix-логи и setup-гайды эпохи Nov–Dec 2025), плюс 4 устаревших markdown-файла в корне (`README.md`, `ARCHITECTURE.md`, `QUICK_START.md`, `TODO.md`), описывающих SDK 52 и «незавершённую миграцию» — обе эти реальности уже неактуальны (сейчас Expo SDK 54 / RN 0.81, миграция давно завершена).

Текущее состояние создаёт три проблемы:

1. **Misleading entry-point.** `README.md` — первое, что видит новый contributor / просмотр на GitHub — описывает SDK 52 и состояние миграции, ссылается на 6 файлов в `/docs/`, никаких отсылок к Writerside.
2. **Двойной источник правды.** В `Writerside/topics/api-payment.md` и `dev-payment-flow.md` есть inline-ссылки на `docs/KaznaAPI.md` (5966 строк spec от провайдера) — Writerside документация *зависит* от файла внутри «архива». Также 7 топиков Writerside содержат TODO-комментарии `<!-- Content to be migrated from /docs/X.md -->`, формализующие незавершённую миграцию, при этом `project-dashboard.md` показывает Documentation как 🔄 Migration to Writerside.
3. **Ложный мусор в build pipeline.** `tsconfig.json` упоминает `docs/**/*`, `scripts/setup-mac-m2.sh:233` echo-ит ссылку на `docs/SETUP_MAC_M2.md`.

**Цель**: закрыть документационный долг профессионально и навсегда:
- Single source of truth — `Writerside/topics/`.
- Vendor docs (Kazna API spec/contract) — рядом с сервисом, который их потребляет (`payment-service/docs/vendor/kazna/`).
- Исторические migration-логи — архив с сохранением git-history (`legacy/docs/`).
- Корневой `README.md` — slim index в стиле «что за проект, как запустить, ссылка на Writerside».
- 5 stub-топиков Writerside — заполнить актуальным контентом на основе текущего состояния кода.
- Все ссылки внутри Writerside и сервисных скриптов — обновить на новые пути.
- В `decision-log.md` зафиксировать решение как ADR-012.
- `project-dashboard.md` Documentation row → ✅.

Предварительные ответы пользователя зафиксированы:
1. **/docs/**: архив в `legacy/docs/`, Kazna выделить в `payment-service/docs/vendor/kazna/`.
2. **Корневые .md**: README — slim index, остальные (ARCHITECTURE, QUICK_START, TODO) удалить.
3. **Writerside stubs**: заполнить все 5 свежим контентом на основе нынешнего состояния кода (а не копи-паст из `/docs/`).

---

## Implementation Plan

### Phase 1 — Move vendor docs (Kazna) to payment-service

Создаём `payment-service/docs/vendor/kazna/` (директория не существует) и переносим туда 3 файла **через `git mv`** (сохраняет history):

| Source | Destination |
|---|---|
| `docs/KaznaAPI.md` | `payment-service/docs/vendor/kazna/KaznaAPI.md` |
| `docs/KaznaAPI.pdf` | `payment-service/docs/vendor/kazna/KaznaAPI.pdf` |
| `docs/KaznaAPI Договор ИТО TransApp.pdf` | `payment-service/docs/vendor/kazna/KaznaAPI-Dogovor-ITO-TransApp.pdf` (rename — убрать пробелы и кириллицу для cross-platform safety) |

Cоздать `payment-service/docs/vendor/kazna/README.md` (короткий — что это и откуда, дата получения, ссылка на актуальную онлайн-версию `https://tprs.ru/KaznaAPI.pdf`, предупреждение «при расхождении прав PDF», ссылки на Writerside topics-потребители).

### Phase 2 — Archive remaining /docs/ to legacy/docs/

`git mv docs legacy/docs` — переносит оставшиеся 57 markdown + `.DS_Store` (после Phase 1 — без Kazna-файлов).

Создать `legacy/docs/README.md` с пояснением:
- Что это исторический архив миграционной эпохи (Nov 2025 – Apr 2026).
- Никаких изменений и обновлений — read-only архив, для git-archeology.
- Single source of truth → `Writerside/topics/`.
- Vendor docs → `payment-service/docs/vendor/kazna/`.
- Если что-то отсюда нужно — мигрировать в Writerside, не редактировать в архиве.

Удалить `docs/.DS_Store` — попадёт под `git mv`, но `.gitignore` уже его не отслеживает; убедиться что он либо переехал, либо игнорируется. Проверить `legacy/.gitkeep` не нужен.

### Phase 3 — Fix all references to old `docs/` paths

#### 3.1. Writerside content links (критично — реальные ссылки в живой документации)

| File | Line(s) | Change |
|---|---|---|
| `Writerside/topics/api-payment.md` | 5 | `docs/KaznaAPI.md` → `payment-service/docs/vendor/kazna/KaznaAPI.md` |
| `Writerside/topics/api-payment.md` | 146 | `docs/KaznaAPI.md:5140` → `payment-service/docs/vendor/kazna/KaznaAPI.md:5140` |
| `Writerside/topics/dev-payment-flow.md` | 7 | `docs/KaznaAPI.md` → `payment-service/docs/vendor/kazna/KaznaAPI.md` |

#### 3.2. Build/script references

| File | Line | Change |
|---|---|---|
| `tsconfig.json` | 21 | Удалить `"docs/**/*"` из exclude (после move папки `docs/` нет). Не заменять на `legacy/docs/**/*` — TypeScript туда не лезет в принципе, лишний шум. |
| `scripts/setup-mac-m2.sh` | 233 | `docs/SETUP_MAC_M2.md` → `Writerside/topics/setup-mac-m2.md` |

#### 3.3. Stub TODO-комментарии в Writerside

Удалить устаревшие HTML-комментарии `<!-- Content to be migrated from /docs/X.md -->` (миграция завершена) **во всех 7 топиках**:
- `Writerside/topics/project-overview.md:3`
- `Writerside/topics/infra-firebase.md:3`
- `Writerside/topics/setup-android.md:3`
- `Writerside/topics/dev-expo-router.md:3`
- `Writerside/topics/dev-payment-flow.md:3`
- `Writerside/topics/setup-mac-m2.md:3`
- `Writerside/topics/dev-mobile.md:3`

#### 3.4. AI-config

`.claude/skills/writerside-docs.md` (lines 41-59) — секция «Migration from /docs/» с миграционной таблицей. Заменить на короткое: «Documentation migration completed 2026-05-04. Source of truth: `Writerside/topics/`. Vendor docs: `payment-service/docs/vendor/kazna/`. Historical archive: `legacy/docs/`.»

### Phase 4 — Fill 5 Writerside stubs with fresh content

Писать **с нуля**, на основе текущего состояния кода (не копи-паст из старого `docs/`).

#### 4.1. `Writerside/topics/project-overview.md`

Расширить с 29 → ~120 строк. Структура:
- **Что это.** TransApp — мобильно-веб-сервис для управления транспортом и оплаты штрафов.
- **Стек (актуальный).** Mobile: RN 0.81 + Expo SDK 54 + TypeScript + Expo Router v6 + NativeWind 4. Payment service: Litestar + Tortoise ORM + PostgreSQL. Web: Expo Web → static на nginx (Yandex Cloud COI VM). Push: Firebase. Maps: Yandex Maps v3.
- **Architecture diagram.** Сохранить и обновить ASCII-диаграмму из текущего стаба (mobile + web → main backend `transapp.ru` + payment-service → Kazna API). Web дописать.
- **Code layout.** Корневые папки: `app/` (Expo Router routes), `src/` (RN code), `payment-service/` (Litestar), `transappweb/` (legacy, archive), `Transappru/` (legacy archive), `nginx/` (deployment), `Writerside/` (docs), `.claude/` (AI config), `legacy/` (archive).
- **Где что искать (cross-references).** Ссылки на `dev-mobile.md`, `dev-web.md`, `api-payment.md`, `dev-backend.md`, `dev-database.md`, `infra-deployment.md`, `decision-log.md`.
- **Что НЕ legacy.** Уточнить разницу между `Transappru/` (read-only archive прежнего проекта) и `transappweb/` (production legacy web, к замене Expo Web).

#### 4.2. `Writerside/topics/dev-expo-router.md`

Расширить с 17 → ~100 строк. Источник истины — текущее состояние папки `app/`. Структура:
- **Setup.** Что Expo Router 6, file-based routing, Stack/Tabs.
- **Tree map.** `app/_layout.tsx`, `app/index.tsx`, `app/(authenticated)/...`, `app/(public)/...`, `app/+not-found.tsx`.
- **Route groups.** `(authenticated)` vs `(public)` — паттерн auth-gate.
- **Patterns.** `useFocusEffect` для sync-а pendingMapData → URL (см. историческую запись 2026-04-21 в dashboard и `app/(authenticated)/pass.tsx`). `router.setParams` вместо synthetic navigation. Web/native parity — `usePassOrder` без `Platform.OS`-guards.
- **Cross-platform.** `.web.tsx` overrides (см. `dev-web.md` для подробностей и list of overrides).
- **Form submit on Enter (web).** Cross-link в `dev-web.md`.
- **References.** ADR-001 (Expo Web), `Writerside/topics/dev-screen-conventions.md`.

#### 4.3. `Writerside/topics/setup-android.md`

Расширить с 16 → ~80 строк. Источник — `dev-mobile.md` секция «Android Studio setup для разработчиков» + ADR-010 + `package.json` scripts. Структура:
- **Prerequisites.** Android Studio (current LTS), JDK через JBR-21 (см. ADR-010), Node ≥20, Android SDK API 34+.
- **First-time setup.**
  1. `npm install` → triggers `postinstall: patch-package` (10 patches для GUI Gradle node-PATH).
  2. `~/.gradle/gradle.properties` — добавить `systemProp.expo.node.path=<absolute path to node>` (см. ADR-010 объяснение).
  3. Open project in Android Studio → Sync Gradle.
- **Run on emulator.** `npm run android`.
- **Run on physical device.** `npm run android:device` / `android:device:specific`. `adb reverse tcp:8001 tcp:8001` для DEV-mode payment-service.
- **Common pitfalls.** Cleartext HTTP для LAN dev (см. `manual-qa-checklist.md` §F11). `expo prebuild` не нужен — `android/` папка управляемая.
- **References.** ADR-010, `infra-eas-build.md`, `manual-qa-checklist.md`.

#### 4.4. `Writerside/topics/infra-firebase.md`

Расширить с 18 → ~80 строк. Источник — `dev-push-notifications.md` (уже наполнен), `plugins/`, `app.json`. Структура:
- **Что используем.** FCM (Firebase Cloud Messaging) — push-уведомления. **НЕ** используем Firebase Auth, Firestore, Analytics, Crashlytics.
- **Configuration files.**
  - iOS: `GoogleService-Info.plist` (gitignored, см. `.gitignore`).
  - Android: `google-services.json` (gitignored).
  - Шаблон/получение — у проджект-овнера.
- **Plugin layer.** `plugins/withFirebaseApp.js` (или эквивалент в `app.json` plugins config — проверить актуальное состояние).
- **Code paths.** `src/services/firebase.ts`, `src/hooks/usePushNotifications.ts` (или текущий путь — проверить).
- **Push payload contract.** Cross-link на `dev-push-notifications.md` (там реальные payload-форматы и матрица типов).
- **Background handler.** Сослаться на `dev-push-notifications.md`.
- **References.** `dev-push-notifications.md`, `dev-mobile.md` § Push, `decision-log.md` если есть relevant ADR.

#### 4.5. `Writerside/topics/dev-payment-flow.md`

Топик уже наполнен (79 строк). Только:
- Удалить TODO-комментарий на строке 3.
- Обновить link на строке 7 (`docs/KaznaAPI.md` → `payment-service/docs/vendor/kazna/KaznaAPI.md`).
- Опционально: добавить короткую преамбулу «User flow» (FineConfirm → WebView → Success/Cancel + polling) перед существующим Phase 3 материалом, чтобы новый читатель видел текущий поток до того, как погрузится в Two Channels детализацию.

(Также 2 «полу-стаба» НЕ переписываем):
- `Writerside/topics/setup-mac-m2.md` (27 строк) — уже актуален, только убрать TODO-комментарий.
- `Writerside/topics/dev-mobile.md` (283 строки) — наполнен, только убрать TODO-комментарий.

### Phase 5 — Root markdown cleanup

#### 5.1. Удалить
- `ARCHITECTURE.md` — заменено `Writerside/topics/project-overview.md` (Phase 4.1).
- `QUICK_START.md` — Android device setup в `Writerside/topics/setup-android.md` (Phase 4.3); общий quickstart переезжает в новый README.
- `TODO.md` — реальный backlog в `project-dashboard.md` (Next Tasks) + `.claude/plans/`.

#### 5.2. Переписать `README.md`

Slim index, ~50 строк. Структура:

```markdown
# TransApp

Mobile + web сервис для управления транспортом, пропусками и оплаты штрафов.

## Stack

- **Mobile:** React Native 0.81, Expo SDK 54, TypeScript, Expo Router v6, NativeWind 4
- **Web:** Expo Web (statically built, served via nginx)
- **Payment service:** Litestar + Tortoise ORM + PostgreSQL
- **Infrastructure:** Yandex Cloud (COI VM, SSL via Yandex Certificate Manager)
- **Push:** Firebase Cloud Messaging
- **Maps:** Yandex Maps v3

## Quick start

```bash
# Install
npm install

# Start payment service (Docker)
cd payment-service && docker compose up -d

# Run web
npm run web

# Run iOS
npm run ios:17

# Run Android (emulator)
npm run android

# Run Android (physical device)
npm run android:device
```

## Documentation

Полная документация — в [Writerside](Writerside/topics/landing.md):

- [Project Dashboard](Writerside/topics/project-dashboard.md) — текущий статус и backlog
- [Project Overview](Writerside/topics/project-overview.md) — архитектура и стек
- [Decision Log](Writerside/topics/decision-log.md) — ADRs
- [Manual QA Checklist](Writerside/topics/manual-qa-checklist.md)

Vendor docs (Kazna API): `payment-service/docs/vendor/kazna/`.
Historical archive: `legacy/docs/`.

## AI development

Этот проект использует Claude Code. См. `CLAUDE.md` для project conventions, `.claude/rules.md` для cross-cutting rules, `.claude/plans/` для активных планов.

## Repository layout

```
app/              Expo Router routes (mobile + web)
src/              RN code (components, hooks, screens, services)
payment-service/  Litestar payment microservice
transappweb/      Legacy web (production, к замене Expo Web)
Transappru/       Legacy mobile archive (read-only)
nginx/            Deployment configs
Writerside/       Documentation (single source of truth)
legacy/           Historical archives
```
```

### Phase 6 — Update meta-docs

#### 6.1. `Writerside/topics/project-dashboard.md`

- **Current Focus table, Documentation row** (line 18):
  Было: `| Documentation | 🔄 Migration to Writerside | From /docs/ markdown |`
  Стало: `| Documentation | ✅ Single source of truth | Writerside `Writerside/topics/`; vendor docs `payment-service/docs/vendor/kazna/`; archive `legacy/docs/` |`

- **Recent Changes** — добавить запись `2026-05-04` в начало списка: closing documentation debt, перечислить операции, ссылка на ADR-012.

- **Next Tasks** (line 108): убрать пункт `2. Migrate key /docs/ content to Writerside topics` (закрыт).

- **Last updated:** 2026-05-04 (уже стоит, оставить).

#### 6.2. `Writerside/topics/decision-log.md` — ADR-012

Добавить в конец списка ADR:

> **ADR-012: Documentation single source of truth**
> Date: 2026-05-04. Status: Accepted.
> Context. До 2026-05-04 в проекте сосуществовали `/docs/` (60 markdown-файлов миграционной эпохи), `Writerside/topics/`, и 4 устаревших файла в корне (README, ARCHITECTURE, QUICK_START, TODO). README показывал SDK 52 и состояние «миграция не завершена», ссылался на 6 файлов в `/docs/`. Writerside-документация имела inline-ссылки на `docs/KaznaAPI.md`. 7 топиков Writerside содержали TODO-комментарии «migrate from /docs/X.md». Documentation в project-dashboard висел как 🔄.
> Decision. Writerside (`Writerside/topics/`) — единственный источник правды для проектной документации. Vendor docs (Kazna API spec/contract) — `payment-service/docs/vendor/kazna/` (рядом с сервисом-потребителем). Историчные migration-логи — `legacy/docs/` (read-only архив, через `git mv` для сохранения history). Корневой README — тонкий index. ARCHITECTURE/QUICK_START/TODO в корне удалены (контент в Writerside и `project-dashboard.md`).
> Alternatives considered.
> 1. *GitBook / Docusaurus / MkDocs* — миграция Writerside → новая платформа стоила бы больше, чем закрытие долга в существующей. Writerside уже настроен (`writerside.cfg`, `ta.tree`, IDE integration), стабилен, бесплатен.
> 2. *Удалить `/docs/` без архива* — потеряли бы git-archeology для исторического контекста миграции (ноябрь 2025 – апрель 2026). `git mv` в `legacy/` — нулевая стоимость, сохраняет history, явный сигнал «не редактировать».
> 3. *Оставить корневые ARCHITECTURE/QUICK_START/TODO как «зеркала» Writerside* — два источника правды → drift, дублирование Documentation Update Rule из CLAUDE.md.
> Consequences.
> - Single read path для contributorов и AI-агентов (`CLAUDE.md` → Writerside topics).
> - `tsconfig.json` exclude `docs/**/*` снят (папки нет).
> - `Writerside/topics/api-payment.md` и `dev-payment-flow.md` ссылаются на `payment-service/docs/vendor/kazna/KaznaAPI.md` — перенос в payment-service делает зависимость явной (vendor docs живут с сервисом).
> - `project-dashboard.md` Documentation row: 🔄 → ✅.

#### 6.3. `CLAUDE.md`

Documentation Update Rule таблица — без изменений (она уже корректно указывает только на Writerside topics). Проверить, что нет противоречий.

Раздел **Project rules** — без изменений.

(Опционально, если уместно) — короткий додаток в начало секции «Documentation Update Rule»: «Single source of truth: `Writerside/topics/` (см. ADR-012). Vendor docs: `payment-service/docs/vendor/kazna/`. Архив: `legacy/docs/` (read-only).» — 1 строка.

#### 6.4. `Writerside/topics/landing.md`

Прочитать (28 строк) и при необходимости обновить — это start-page Writerside (`writerside.cfg → start-page="landing.md"`). Если она показывает устаревшую структуру/TOC — обновить.

---

### Phase 7 — Verify (read-only checks после всех изменений)

```bash
# 1. TypeScript — должен пройти 0 errors после удаления docs/**/* из tsconfig
npx tsc --noEmit

# 2. Tests — sanity, ничего не должно сломаться (документация не влияет, но проверим)
npm test

# 3. Финальный grep — никаких "docs/" путей вне Writerside/topics/* (исторические записи в Recent Changes), legacy/docs/, payment-service/docs/, .claude/, node_modules
grep -rn "docs/" \
  --include="*.md" --include="*.ts" --include="*.tsx" \
  --include="*.js" --include="*.json" --include="*.sh" \
  --include="*.yml" --include="*.yaml" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=legacy --exclude-dir=Transappru --exclude-dir=transappweb \
  --exclude-dir=.expo \
  | grep -v "Writerside/topics/project-dashboard.md.*Recent Changes"  # historical
# Допустимый шум: ссылки на payment-service/docs/vendor/kazna/, .claude/skills/, .claude/plans/

# 4. Backend tests (sanity, документация не должна влиять)
cd payment-service && docker compose exec payment-service pytest

# 5. Backend lint
cd payment-service && ruff check app/

# 6. Sanity check — git mv сохранил history
git log --follow legacy/docs/MIGRATION_STATUS.md | head -5
git log --follow payment-service/docs/vendor/kazna/KaznaAPI.md | head -5
```

---

## File-level summary

### New files
- `payment-service/docs/vendor/kazna/README.md`
- `legacy/docs/README.md`

### Moved (`git mv` — preserves history)
- 3 Kazna files: `docs/KaznaAPI.{md,pdf}` + контракт PDF → `payment-service/docs/vendor/kazna/`
- 57 остальных `docs/*` → `legacy/docs/*`

### Deleted
- `ARCHITECTURE.md`
- `QUICK_START.md`
- `TODO.md`

### Rewritten
- `README.md` (172 → ~50 строк)
- `Writerside/topics/project-overview.md` (29 → ~120)
- `Writerside/topics/dev-expo-router.md` (17 → ~100)
- `Writerside/topics/setup-android.md` (16 → ~80)
- `Writerside/topics/infra-firebase.md` (18 → ~80)

### Edited (point fixes)
- `Writerside/topics/dev-payment-flow.md` (TODO comment + link)
- `Writerside/topics/dev-mobile.md` (TODO comment only)
- `Writerside/topics/setup-mac-m2.md` (TODO comment only)
- `Writerside/topics/api-payment.md` (2 link updates)
- `Writerside/topics/project-dashboard.md` (Documentation row + Recent Changes + Next Tasks)
- `Writerside/topics/decision-log.md` (ADR-012)
- `Writerside/topics/landing.md` (proof-read; update if needed)
- `tsconfig.json` (remove `docs/**/*` from exclude)
- `scripts/setup-mac-m2.sh:233` (link update)
- `.claude/skills/writerside-docs.md` (replace migration section)
- `CLAUDE.md` (optional 1-line додаток)

### Untouched (intentional)
- `payment-service/CLAUDE.md`, `src/CLAUDE.md`, `transappweb/CLAUDE.md` — узкие, актуальные.
- `payment-service/README.md`, `transappweb/README.md` — submodule-specific entry-points, отдельные сущности.
- `.claude/plans/`, `.claude/rules.md` — AI-config, не общая документация.
- `legacy/SHOW CREATE TABLE.txt` — DB-схема, отдельный артефакт.

---

## Plan persistence

После approval (per `.claude/rules.md` + дашборд convention) этот план сохранить как `.claude/plans/2026-05-04-documentation-cleanup.md` со статусом `in-progress` → `completed` по завершению.

## Commit strategy

Один логически связанный коммит, сообщение в Conventional Commits:

```
docs: close documentation debt — Writerside as single source of truth (ADR-012)

- Move /docs/ to legacy/docs/ (57 files, git mv preserves history)
- Move Kazna vendor docs to payment-service/docs/vendor/kazna/
- Rewrite root README.md as slim index; delete ARCHITECTURE.md, QUICK_START.md, TODO.md
- Fill 5 Writerside stubs with current-state content (project-overview,
  dev-expo-router, setup-android, infra-firebase, dev-payment-flow link fix)
- Strip TODO-comments from 7 Writerside topics
- Update tsconfig.json, scripts/setup-mac-m2.sh, api-payment.md links
- Add ADR-012 to decision-log; project-dashboard Documentation row → ✅
```

Push — только по explicit approval пользователя.
