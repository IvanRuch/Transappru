# Expo Router Guide

TransApp uses **Expo Router v6** (file-based routing на Stack-навигации
React Navigation). Включён `experiments.typedRoutes: true` — все маршруты
типизированы из `.expo/types/router.d.ts`, дёрганые href-ы ловятся TS-ом.

## Route tree

```
app/
├── _layout.tsx                          ← root layout (providers, fonts, init)
├── +html.tsx                            ← web SSR HTML shell (Expo Web)
├── index.tsx                            ← entry → AuthScreen / redirect
├── pin.tsx                              ← PIN confirm
├── onboarding.tsx                       ← first-login modal
├── invite-user.tsx                      ← deep-link invite handler
├── deleted.tsx                          ← deleted-profile screen
├── user.tsx                             ← profile (native)
├── user.web.tsx                         ← profile (web override)
└── (authenticated)/                     ← auth-gated group
    ├── _layout.tsx                      ← authenticated stack (native)
    ├── _layout.web.tsx                  ← authenticated layout (web sidebar)
    ├── main.tsx
    ├── auto-list.tsx                    ← list of vehicles
    ├── auto/[id].tsx                    ← vehicle detail (dynamic route)
    ├── auto-fine.tsx
    ├── auto-driver.tsx
    ├── del-user.tsx
    ├── inn.tsx
    ├── charges.tsx                      ← fines (ГИБДД / Платон)
    ├── drivers.tsx
    ├── notifications.tsx
    ├── notification-settings.tsx
    ├── services.tsx
    ├── pass.tsx                         ← pass order (native)
    ├── pass-yamap.tsx                   ← Yandex Maps pass (native)
    ├── pass-yamap.web.tsx               ← Yandex Maps v3 (web override)
    ├── fine-payment-select.tsx
    ├── fine-payment-confirm.tsx
    ├── fine-payment-webview.tsx
    ├── fine-payment-webview.web.tsx     ← iframe variant for web
    └── fine-payment-success.tsx
```

## Route groups

`(authenticated)` — это **route group** (скобки в имени). Не добавляется в URL,
но даёт shared `_layout.tsx` для всех вложенных экранов. Используется
auth-gate'ом: `_layout.tsx` группы редиректит в `/` если нет токена.
Mirror'ится `_layout.web.tsx` (sidebar layout вместо нативного stack).

Public-зона = всё, что не в `(authenticated)/`: `index`, `pin`, `onboarding`,
`invite-user`, `deleted`. Они доступны без логина.

## Cross-platform overrides

`.web.tsx` рядом с `.tsx` — Metro/Expo Web резолвит `.web.tsx` для web,
`.tsx` — для native. Используется когда web-вёрстка существенно отличается
(sidebar, iframe вместо WebView, Yandex Maps v3 SDK вместо
`react-native-yamap-plus`). Подробности и список оверрайдов — в
[dev-web.md](dev-web.md).

## Navigation patterns

### URL-driven state vs synthetic navigation

Mobile/web parity: вместо synthetic-navigation (передавать данные через
`navigation.params`) — синхронизировать pendingMapData в URL через
`router.setParams`. Это убирает Platform.OS-guards в hooks (см. ADR-003 +
запись 2026-04-21 в `project-dashboard.md`):

- `usePassOrder` идёт идентично на mobile и web.
- `useFocusEffect` в `app/(authenticated)/pass.tsx` синкает state → URL
  при возвращении на экран.
- Reference implementation: `pass.tsx` + `pass-yamap.tsx` (39 LOC wrapper
  вместо 100 LOC bridge до рефакторинга).

### Form submit on Enter (web)

Submit-формы (Auth, Pin, Inn, RNIS-check) обрабатывают Enter через
capture-phase keydown listener на ref-обёртке всей карточки. Pattern
подробно описан в [dev-web.md](dev-web.md) → раздел «Form submit on Enter
(web)». Crash-кейс с focusable Pressable между input и submit (чекбокс
согласия в AuthScreen) разобран там же.

### Typed routes

С `typedRoutes: true` href в `<Link href="/...">` и `router.push("/...")`
проверяется компилятором. После добавления нового файла в `app/` нужно
один раз `npx expo start` — Expo генерирует `.expo/types/router.d.ts`.

## References

- ADR-001 — Web version via Expo Web shared codebase
- ADR-003 — Extract shared hooks (`useAutoData`, `usePassOrder`, …)
- ADR-005 — Extract shared UI sub-components from screen pairs
- [dev-screen-conventions.md](dev-screen-conventions.md) — обязательный playbook для нового экрана
- [dev-web.md](dev-web.md) — `.web.tsx` overrides, web-specific patterns
