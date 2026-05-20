# Client-side hardening против "Список авто пуст + пропал UI" при медленном `/get-auto-list`

> Status: approved 2026-05-20

## Context

У клиента в проде (v2.0.17, 3 марта 2026) симптом: главный экран показывает «Список авто пуст», одновременно пропадает **кнопка фильтра в шапке** и **левое меню (hamburger → `LeftMenuModal`)**. Pull-to-refresh, переустановка, перезагрузка телефона не помогают; на веб в DevTools видно `AxiosError: timeout of 30000ms exceeded` на `/get-auto-list`. На веб одновременно ломается `UserDataContext.updateUserData`. После того как один запрос на сервере «пробивается», всё чинится одновременно на всех устройствах — классический симптом холодного/тяжёлого запроса на бэкенде.

Корневая причина на сервере (тяжёлый запрос на сборку `user_data + auto_list` именно для этого пользователя), доступа к серверу у нас нет — он у внешнего разработчика. На клиенте при этом текущая логика делает ситуацию максимально плохой:

1. **`src/screens/auto/AutoListScreen.tsx:71` и `:216`** — весь chrome главного экрана (drawer toggle, фильтр, нотификации, debt, bottom menu) гейтится одним условием `!!(userData && userData.firm)`. Любая ошибка `/get-auto-list` оставляет `userData.firm === ''` (см. init в `src/hooks/useAutoData.ts:96`) → весь chrome исчезает.
2. **`src/hooks/useAutoData.ts:383-396`** — catch молча игнорирует всё кроме 401: при timeout/network/5xx состояние ошибки никуда не уходит, UI остаётся «пустым», ретраить пользователю нечего, выйти из аккаунта тоже нельзя (logout доступен только из User Profile, в который надо попасть через тот самый drawer).
3. **`api.post('/get-auto-list', …)`** — глобальный axios timeout 30 секунд (`src/services/api.ts:34` и `src/services/api.web.ts:58`). Для холодного запроса этого иногда мало.
4. **Нет persisted `userData`** — каждый рестарт приложения начинается с пустого `userData`, поэтому первый paint полностью зависит от свежего ответа.

Цель: на стороне клиента — там, где можем, — сделать поведение «наилучшим профессиональным образом» при медленном/упавшем `/get-auto-list`, не трогая сервер и без архитектурного расширения скоупа.

Эффект:
- Drawer и кнопка фильтра доступны всегда, пока пользователь авторизован. Logout достижим даже когда данные не загрузились.
- При ошибке/timeout пользователь видит понятное «Не удалось загрузить список — Попробовать ещё раз», а не немую пустоту.
- На холодный запрос даём серверу достаточный таймаут (60 с) per-request, не меняя глобальный.
- После рестарта приложения первый paint уже с chrome из последнего успешного `userData`, до того как свежий ответ дойдёт.

## Scope (files to modify)

Mobile / cross-platform:
- `src/hooks/useAutoData.ts` — состояние `loadError`, persisted `userData`, per-request timeout.
- `src/hooks/useAutoList.ts` — пробросить `loadError` наружу (барреллёр).
- `src/screens/auto/AutoListScreen.tsx` — снять gate `userData.firm`; различить error vs empty в `ListEmptyComponent`.
- `src/components/auto/AutoListLoadError.tsx` — **новый** компонент «Не удалось загрузить — Попробовать ещё раз».
- `src/hooks/useUserProfile.ts` — очистить `ta_user_data_cache_v1` при logout.

Web:
- `src/contexts/UserDataContext.tsx` — `loadError`, restore из storage, per-request timeout.
- `src/screens/auto/AutoListScreen.web.tsx` — отрендерить ту же ошибку при `loadError`.

Tests:
- `src/hooks/__tests__/useAutoData.test.tsx` — timeout/network/server → `loadError`, успех чистит, restore из AsyncStorage.
- `src/contexts/__tests__/UserDataContext.test.tsx` — timeout не очищает userData, выставляет `loadError`.

Documentation (per project CLAUDE.md "Documentation Update Rule"):
- `Writerside/topics/project-dashboard.md` — отметить hotfix + дата.
- `Writerside/topics/dev-mobile.md` — секция про `loadError`/persisted userData/timeout.
- `Writerside/topics/decision-log.md` — новый ADR.
- `.claude/tasks.md` — закрыть задачу `[x]` в том же коммите.

Out of scope (явно отбрасываем):
- Авто-retry с backoff — сервер уже под нагрузкой. Только manual retry button.
- Перенос UserDataContext на mobile (ADR-020 next phase).
- Изменение формата API.
- Sentry / PostHog / external logging.
- Логика «онбординг», «announce services», «sort modes».

## Approach

### 1. Снять `userData.firm` как глобальный gate chrome

`AutoListScreen.tsx:71` и `:216`: убрать внешнее условие `!!(userData && userData.firm)`. Chrome (drawer toggle, кнопка фильтра, bottom menu) рендерится всегда. Внутренние data-зависимые элементы (debt indicator, notification badge) гейтятся каждый по своему полю — они уже условные в текущем коде, просто без внешнего guard'а они корректно отрисуются как пустые.

Кнопка фильтра: условие `(autoList.length > 0 || hasActiveFilters)` остаётся (UX-обоснованное), но плейсхолдер `View` всегда присутствует, чтобы layout не схлопывался.

### 2. `loadError` в `useAutoData` и проброс через `useAutoList`

```ts
type LoadErrorKind = 'timeout' | 'network' | 'server' | 'unknown';
type LoadError = { kind: LoadErrorKind; status?: number } | null;
const [loadError, setLoadError] = useState<LoadError>(null);
```

В `fetchAutoList`:
- На успехе перед `return data` — `setLoadError(null)`.
- В catch — после `isCancel` и 401-редиректа классифицировать:
  - `ECONNABORTED` или `message.includes('timeout')` → `'timeout'`.
  - `!response && request` → `'network'`.
  - `status >= 500` → `'server'` (с `status`).
  - остальное → `'unknown'`.

Возврат через `useAutoList`.

### 3. Компонент `AutoListLoadError`

Новый файл `src/components/auto/AutoListLoadError.tsx`, parity с `AutoListEmptyState.tsx`:
- Заголовок: «Не удалось загрузить список».
- Подзаголовок по kind (timeout/network/server/unknown).
- Кнопка «Попробовать ещё раз» (`onRetry`).

В `ListEmptyComponent`:
```
if (loadError) → <AutoListLoadError kind onRetry={refreshAutoList} />
else if (isSearching || isLoading) → spinner
else → <AutoListEmptyState …>
```
Симметрично в `AutoListScreen.web.tsx`.

### 4. Per-request timeout 60s

`useAutoData.ts:248` и `UserDataContext.tsx:137`: добавить `timeout: 60000` в `api.post(..., { signal, timeout: 60000 })`. Глобальный 30s не трогаем.

### 5. Persist `userData`

Ключ `ta_user_data_cache_v1`:
- В `useAutoData`: при успешном `setUserData(data.user_data)` — fire-and-forget `AsyncStorage.setItem(...)`.
- На монтировании хука — асинхронно прочитать; если есть кеш с непустым `firm` и текущее `userData.firm === ''` — выставить из кеша. Не перетираем уже-свежий `userData`, который мог обогнать чтение.
- На logout (`useUserProfile.ts`) — `AsyncStorage.removeItem('ta_user_data_cache_v1')`.

Симметрично в `UserDataContext.tsx` (на web `@react-native-async-storage/async-storage` использует localStorage).

### 6. Web parity

`UserDataContext.tsx`:
- `loadError` в value.
- Catch классифицирует так же.
- `timeout: 60000`.
- Restore при mount.

`AutoListScreen.web.tsx`: рендерит `<AutoListLoadError>` при `loadError`.

### 7. Logout fallback (минимально)

Дополнительной кнопки logout не добавляем — после фикса drawer всегда виден, через него LeftMenuModal → User → logout достижим. Если выясним, что в `LeftMenuModal` тоже нет logout — это уже отдельное UX-решение.

## Verification

### Unit tests

`useAutoData.test.tsx`:
- timeout/network/server/unknown classification.
- успешный refetch после ошибки чистит loadError.
- restore: предзаписанный `ta_user_data_cache_v1` → после mount `userData.firm` непустой ещё до завершения fetch.

`UserDataContext.test.tsx`:
- timeout не сбрасывает `userData`, выставляет `loadError`.
- успешный updateUserData чистит loadError.

Запуск: `npx jest src/hooks/__tests__/useAutoData.test.tsx src/contexts/__tests__/UserDataContext.test.tsx`.

### Manual (mobile)

1. Залогиниться. Задержать `/get-auto-list` > 60 с (Charles/Proxyman/`adb tc`).
2. Ожидание: drawer и фильтр остаются. После таймаута — `AutoListLoadError` с retry.
3. Retry → fetch → восстановление.
4. Force-quit → старт → первый paint с chrome из кеша.
5. Logout → re-login → кеш очищен.

### Manual (web)

1. DevTools Offline → reload → error UI с retry, sidebar виден.
2. Снять Offline → Retry → ОК.
3. localStorage `ta_user_data_cache_v1` после первого успешного логина присутствует.

### Regression check

- 401 поведение не меняется (interceptor сам делает clear+redirect).
- ADR-020 dedup на web сохраняется (in-flight Promise).
- `useFocusEffect` на AutoListScreen не зацикливается на ошибке (focus не ретригерит автоматически).

## Documentation updates

- `Writerside/topics/project-dashboard.md` — hotfix запись 2026-05-20.
- `Writerside/topics/dev-mobile.md` — секция про `loadError` API.
- `Writerside/topics/decision-log.md` — новый ADR «Resilient bootstrap для `/get-auto-list`».
- `.claude/tasks.md` — задача со ссылкой `[[plans/2026-05-20-auto-list-resilient-bootstrap]]`, закрыть `[x]` в том же коммите.

## Commit shape

```
fix(auto-list): resilient bootstrap when /get-auto-list is slow or fails

- Decouple header/drawer/filter chrome from userData.firm
- Add loadError state + AutoListLoadError UI with retry
- Per-request timeout 60s for /get-auto-list (was 30s global)
- Persist userData to AsyncStorage; restore on cold start
- Web parity in UserDataContext + AutoListScreen.web
- Tests for timeout/network/server classification + persistence
- Docs: dev-mobile, decision-log (new ADR), project-dashboard
- Close tasks.md entry
```

Никакого `git push` без явной команды пользователя.

---

## PostScript (same day, ADR-024 follow-up)

Debug-логирование, поднятое поверх этого плана, на физическом Android
выявило три дополнительных дефекта клиента, усугублявших cold-call
backend. Они закрыты отдельным планом
[[plans/2026-05-20-auto-list-native-parity]] (ADR-024):

- Двойной параллельный `/get-auto-list` на mount AutoListScreen
  (native + web симметрично) — fix: first-focus skip в `useFocusEffect`.
- Module-level in-flight Promise dedup для `updateUserDataOnly` на
  native (симметрично web `UserDataContext.inFlightRef`).
- `GET_AUTO_LIST_TIMEOUT_MS` 60 s → 90 s (cold-call наблюдался 21 s).
- `classifyLoadError`: native `ERR_NETWORK` + duration ≥ 0.9 × timeout
  → `'timeout'` (раньше misclassify as `'network'`).
- Debug-логирование interceptor'ов под `__DEV__` гардом.

Тот PR (часть PR #53) включает оба изменения единым потоком —
ADR-023 (resilient bootstrap) + ADR-024 (native parity).
