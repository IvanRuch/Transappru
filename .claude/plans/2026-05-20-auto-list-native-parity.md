# Native parity fixes for `/get-auto-list` resilience (eliminate double-fetch, fix timeout classification, gate debug logs)

> Status: draft 2026-05-20, ADR-024 follow-up to ADR-023

## Context

Debug-логирование (закоммичено в `chore(debug):` поверх ADR-023) на Android физическом устройстве показало конкретные дефекты клиентской стороны, которые **усугубляют** медлительность backend на cold-call `/get-auto-list`:

1. **Двойной параллельный `/get-auto-list` на mount AutoListScreen**:
   - `useFocusEffect` → `autoListHook.updateUserData()` → `useAutoData.updateUserDataOnly()` → `POST /get-auto-list` (`limit=0`, `updateUserAbortRef`).
   - `useEffect([])` → `autoListHook.loadData()` → `useAutoData.fetchAutoList()` → `POST /get-auto-list` (`limit=10`, `fetchAbortRef`).
   - Два AbortController'а независимы, друг друга не отменяют. На сервере для одного user_id одновременно работают два тяжёлых query, конкурируют за тот же DB lock. Дефект симметричен на web (`AutoListScreen.web` + `userDataCtx.updateUserData()` + `loadData`). На web этого мы раньше не видели — не было debug-логов.

2. **Неправильная классификация timeout на native**: axios на React Native при истечении `timeout` config выкидывает ошибку с `error.code === 'ERR_NETWORK'` и `message === 'Network Error'`, в отличие от axios на web (`ECONNABORTED` / `'timeout of …'`). Наш `classifyLoadError` (`src/utils/loadError.ts`) проверяет именно эти web-маркеры → native-timeout классифицируется как `'network'` → пользователь видит «Проверьте подключение к интернету», хотя интернет работает, просто сервер не успел.

3. **60 секунд недостаточно для cold-call**: в реальном логе первая успешная попытка для prod-аккаунта заняла **21056 мс**, последующие — 3351 мс. Текущий `GET_AUTO_LIST_TIMEOUT_MS = 60000` (ADR-023) обрезал ситуацию когда сервер всё-таки в итоге отвечает после первого долгого hit. 90 секунд даст полнотную попытку первый раз, без авто-retry-шторма.

4. **Debug-логи добавлены глобально**, без `__DEV__` гарда — они полезны в dev и release-staging билдах, но засоряют production logs / Sentry.

Цель — устранить эти четыре дефекта на стороне клиента, не трогая сервер. Доработки backend (cold SQL aggregate в `/get-auto-list`) пометить как отдельную долгосрочную задачу — backend сейчас на perl у внешнего разработчика, переписывание ожидается в перспективе.

## Scope (files to modify)

Code:
- `src/screens/auto/AutoListScreen.tsx` — first-focus skip: на первом mount не звать `updateUserData()` из `useFocusEffect` (его задачу покрывает `loadData()` в `useEffect([])`). На повторных focus — продолжать звать lightweight `updateUserDataOnly`.
- `src/screens/auto/AutoListScreen.web.tsx` — симметрично: first-focus skip для `userDataCtx.updateUserData()`.
- `src/hooks/useAutoData.ts` —
  - module-level in-flight Promise dedup в `updateUserDataOnly` (защита от параллельных focus listener'ов и других race);
  - `GET_AUTO_LIST_TIMEOUT_MS` 60000 → 90000;
  - проброс константы наружу для классификатора.
- `src/contexts/UserDataContext.tsx` — `GET_AUTO_LIST_TIMEOUT_MS` 60000 → 90000.
- `src/utils/loadError.ts` — детект native-style timeout (heuristic: `code === 'ERR_NETWORK'` **и** длительность ≥ porog) и явная проверка по `axios.AxiosError.code === 'ETIMEDOUT'`. Принять опциональный `durationMs` параметр.
- `src/services/api.ts` и `src/services/api.web.ts` — обернуть debug-логирование (`⬆️/⬇️/✗`) в `if (__DEV__)` гард. Логика обработки ошибок (interceptor body) остаётся без изменений.

Tests:
- `src/hooks/__tests__/useAutoData.test.tsx` — кейс на module-level dedup `updateUserDataOnly` (две одновременные вызова → один сервер-запрос).
- `src/utils/__tests__/loadError.test.ts` (новый файл, если ещё нет) — кейсы на классификацию: web-style ECONNABORTED → timeout; native-style ERR_NETWORK + duration ≥ porog → timeout; ERR_NETWORK + duration < porog → network.
- `src/contexts/__tests__/UserDataContext.test.tsx` — обновить тест на dedup, если он зависит от старого 60s timeout (вряд ли).
- AutoListScreen first-focus skip — pure-React behavior. Если есть test для AutoListScreen / focusEffect — добавить кейс. Иначе manual.

Documentation:
- `Writerside/topics/decision-log.md` — **ADR-024** «Eliminate native double-fetch / improve timeout classification (ADR-023 follow-up)».
- `Writerside/topics/dev-mobile.md` — секция «Resilient auto-list bootstrap» дополнить тремя пунктами (first-focus skip, native dedup, native ERR_NETWORK heuristic).
- `Writerside/topics/project-dashboard.md` — entry 2026-05-20 (вторая запись за день).
- `.claude/plans/2026-05-20-auto-list-resilient-bootstrap.md` — короткое «PostScript: ADR-024 follow-up», ссылка на новый план.
- `.claude/tasks.md` — закрыть текущую задачу-followup (`#waiting/external-dependency` записать как done в формулировке «передано Ивану, ждать переписывания backend»). Добавить новую открытую: «Cross-call dedup `fetchAutoList`/`updateUserDataOnly`» — архитектурно предпочтительный вариант, отложен до переписывания backend на новый стек.

Out of scope (explicitly):
- **Cross-call dedup** между `fetchAutoList` и `updateUserDataOnly` (когда один тяжёлый запрос покрывает результат лёгкого). Архитектурно правильно, но риск регрессий на маленьком окне до переписывания backend высок. Отдельная задача.
- Полный port `UserDataContext` на mobile (другая большая задача).
- Изменение `/system-notice` URL для физического устройства в dev. Шум в логе мы видим, но это dev-only и не влияет на prod.
- Любые server-side изменения.
- Удаление / понижение `LOAD_ALL_LIMIT = 2000` (`plate_digits` режим). Это отдельный вопрос.

## Approach

### 1. First-focus skip (AutoListScreen.tsx и AutoListScreen.web.tsx)

Идея: на самом первом фокусе экрана (= initial mount) `useEffect([])` → `loadData()` сам по себе обновит userData через `fetchAutoList`. Звать дополнительно `updateUserData()` (limit=0) бессмысленно и вредно — это второй параллельный запрос за теми же данными. На последующих focus (пользователь вернулся с другого экрана) `loadData()` не выполняется, а нам нужно обновить только profile/notifications/onboarding — для этого lightweight `updateUserData()` идеален.

Реализация (native, `AutoListScreen.tsx`):
```ts
const firstFocusRef = useRef(true);

useFocusEffect(useCallback(() => {
  resetViewedCount();
  autoListHook.decrementNotificationCount(viewedCount);

  // На первом фокусе loadData() покроет обновление userData через
  // полный /get-auto-list. Звать сюда updateUserData() — значит делать
  // лишний параллельный запрос. На повторных focus loadData не идёт,
  // а профиль/уведомления/онбординг обновить надо — поэтому lightweight.
  if (firstFocusRef.current) {
    firstFocusRef.current = false;
  } else {
    autoListHook.updateUserData();
  }

  autoListHook.startPulseAnimation();
  return () => autoListHook.stopPulseAnimation();
}, []));
```

Web (`AutoListScreen.web.tsx`) — точно то же, только `userDataCtx.updateUserData()`.

### 2. Module-level in-flight dedup для `updateUserDataOnly` (useAutoData.ts)

Защита на случай, когда `useFocusEffect` дёргается несколько раз подряд (например быстрые re-focus / app foreground / навигационная нестабильность). На web это уже есть в `UserDataContext.inFlightRef`; реплицируем тот же паттерн на native, на уровне модуля:

```ts
// useAutoData.ts (top-level, рядом с _onboardingRedirectDone и _announceShown)
let _inFlightUpdateUserData: Promise<void> | null = null;

const updateUserDataOnly = useCallback(async (): Promise<void> => {
  // На web делегируем в Context (он сам имеет dedup).
  if (userDataCtx) return userDataCtx.updateUserData();

  // На native: возвращаем существующий промис если запрос в полёте.
  if (_inFlightUpdateUserData) return _inFlightUpdateUserData;

  const promise = (async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      updateUserAbortRef.current?.abort();
      const controller = new AbortController();
      updateUserAbortRef.current = controller;

      const res = await api.post(
        '/get-auto-list',
        { token, auto_list_limit: 0 },
        { signal: controller.signal, timeout: GET_AUTO_LIST_TIMEOUT_MS },
      );
      if (controller.signal.aborted) return;
      if (res.data.user_data) {
        setUserData(res.data.user_data);
        void setCachedUserId(res.data.user_data.id);
        writeCachedUserData(res.data.user_data);
        if (res.data.other_user_list) setOtherUserList(res.data.other_user_list);
      }
    } catch (e: any) {
      if (isCancel(e)) return;
      console.log('UserData update error', e);
    } finally {
      if (updateUserAbortRef.current && updateUserAbortRef.current.signal.aborted) {
        // controller был aborted — оставляем как есть
      } else {
        // освобождаем ссылку только если этот controller всё ещё актуальный
      }
      _inFlightUpdateUserData = null;
    }
  })();

  _inFlightUpdateUserData = promise;
  return promise;
}, [userDataCtx]);
```

Module-level (а не useRef) — потому что:
- `useRef` сбрасывается при unmount/remount hook.
- Два разных потребителя `useAutoData` (если такой случай был бы — сейчас один потребитель) должны делить один in-flight promise.
- Совпадает с паттерном `_onboardingRedirectDone` и `_announceShown` в том же файле.

### 3. Timeout 60s → 90s

В `src/hooks/useAutoData.ts` и `src/contexts/UserDataContext.tsx`:
```ts
const GET_AUTO_LIST_TIMEOUT_MS = 90000; // было 60000
```
Комментарий обновить: cold-call для prod-аккаунтов наблюдался до 21 сек по логам. 90 сек даёт запас и для медленных мобильных сетей. Глобальный axios timeout 30s для остальных endpoint'ов не трогаем.

Также экспортнуть константу `GET_AUTO_LIST_TIMEOUT_MS` из `useAutoData.ts` для `classifyLoadError` (см. ниже).

### 4. Native ERR_NETWORK + duration heuristic (loadError.ts)

Добавить второй параметр `durationMs` (необязательный) и эвристику: если `code === 'ERR_NETWORK'` и `durationMs >= 0.9 * timeout` (с запасом) — это timeout, не network. Также явно ловим `code === 'ETIMEDOUT'`.

```ts
export function classifyLoadError(
  error: any,
  options?: { durationMs?: number; timeoutMs?: number },
): LoadError {
  if (!error) return null;

  // Web axios: ECONNABORTED / message contains 'timeout'
  // Native (React Native + XHR): code 'ETIMEDOUT' или 'ERR_NETWORK' + duration ≥ timeout
  if (
    error.code === 'ECONNABORTED'
    || error.code === 'ETIMEDOUT'
    || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))
  ) {
    return { kind: 'timeout' };
  }
  if (
    error.code === 'ERR_NETWORK'
    && options?.durationMs !== undefined
    && options?.timeoutMs !== undefined
    && options.durationMs >= 0.9 * options.timeoutMs
  ) {
    return { kind: 'timeout' };
  }
  if (error.response) {
    const status: number = error.response.status;
    if (status >= 500) return { kind: 'server', status };
    return { kind: 'unknown', status };
  }
  if (error.request) return { kind: 'network' };
  return { kind: 'unknown' };
}
```

Call sites:
- `useAutoData.ts` catch — взять `Date.now() - t0` (метка ставится в interceptor, можно повторить локально или достать из `error.config?.metadata?.t0`) и передать `{ durationMs, timeoutMs: GET_AUTO_LIST_TIMEOUT_MS }`. Самый простой путь — использовать `error.config?.metadata?.t0` (interceptor уже ставит).
- `UserDataContext.ts` catch — то же.

### 5. Debug-логи под `__DEV__` (api.ts, api.web.ts)

Обернуть только новые строки (`⬆️ ⬇️ ✗`) — старая логика обработки ошибок и редиректов остаётся неизменной. Web уже знает `__DEV__` — это глобал из metro/expo. Native тоже.

```ts
if (__DEV__) {
  console.log(`⬆️ [API] ${method} ${url} @ ${t0}`);
}
```

В release-сборке (`__DEV__ === false`) логи исчезают, production logs чисты. В dev — сохраняются для будущих диагностик.

### 6. Tests

Новые / обновлённые:
- `src/utils/__tests__/loadError.test.ts` (new file unless exists): unit-тесты на classify — ECONNABORTED → timeout; ETIMEDOUT → timeout; ERR_NETWORK + duration 80000 / timeout 90000 → timeout; ERR_NETWORK + duration 1000 / timeout 90000 → network; HTTP 502 → server status=502.
- `src/hooks/__tests__/useAutoData.test.tsx`: kейс «updateUserDataOnly dedupes concurrent callers» — два параллельных `result.current.updateUserData()` (на native, нет userDataCtx) → один `api.post` call (через jest.spyOn). Симметрично существующему web-тесту в `UserDataContext.test.tsx:85-108`.
- `AutoListScreen.tsx` first-focus skip — поведенческий тест на focusEffect сложный (jest-expo SDK 54 нет), может быть отложен на manual QA. Закроем визуальной проверкой через лог: `npx expo run:android --device` → лог должен показать ОДИН `⬆️ POST /get-auto-list` per mount, не два.

## Verification

### Unit (jest)

```
npx jest src/utils/__tests__/loadError.test.ts \
         src/hooks/__tests__/useAutoData.test.tsx \
         src/contexts/__tests__/UserDataContext.test.tsx
```
Ожидаемо: все existing тесты проходят без изменений, +новые кейсы зелёные.

### Static

```
npx tsc --noEmit                            # 0 errors
npx expo lint <changed files>               # 0 new warnings
```

### Manual (Android device, dev build, via adb logcat)

1. Force-close TransApp на устройстве. Запустить `adb logcat -s ReactNativeJS:V | tee ~/transapp-2.log`.
2. Запустить приложение. Залогиниться, открыть AutoList.
3. В логе **должен быть один** `⬆️ POST /get-auto-list per mount`, не два (limit=10).
4. Pull-to-refresh → один `⬆️ POST /get-auto-list`.
5. Перейти на детальный экран авто → вернуться назад → должен быть один `⬆️ POST /get-auto-list @… auto_list_limit=0` (lightweight updateUserData на повторном focus).
6. Симулировать backend slow (например через Charles или временное замораживание сетевого ответа) → дождаться `✗ Network/Timeout on /get-auto-list after 90xxx ms` → `AutoListLoadError` показывает «Сервер отвечает дольше обычного» (kind=`timeout`), не «Проверьте подключение» (был бы `network`).
7. Force-close → реальный offline (Wi-Fi off) → запустить → должен быть kind=`network`, «Проверьте подключение к интернету».

### Manual (web)

1. `localhost:8081/auto-list` после логина → в Console **один** `⬆️ POST /get-auto-list` per mount.
2. На повторном focus — один `auto_list_limit=0`.
3. Production build (`expo export:web && serve dist`) → проверить что debug-логи отсутствуют (`__DEV__ === false`).

### Regression check

- ADR-023 поведение сохраняется: chrome не исчезает при ошибке, retry-кнопка работает, persist userData отрабатывает.
- 401 поведение не меняется (interceptor сам делает clear+redirect).
- ADR-020 dedup на web сохраняется.
- pull-to-refresh и filter changes — каждый по-прежнему отменяет предыдущий запрос через AbortController.

## Commit shape

Один логический коммит (или два, если удобнее разделить):
```
fix(auto-list): eliminate double /get-auto-list on mount, fix native timeout classification (ADR-024)

- AutoListScreen[.web]: first-focus skip — не звать updateUserData() в
  useFocusEffect на initial mount, его покроет loadData() через
  fetchAutoList(). На повторных focus — продолжать звать lightweight
  updateUserData() (limit=0).
- useAutoData: module-level in-flight Promise dedup для
  updateUserDataOnly на native; симметрично web UserDataContext.inFlightRef.
- Timeout /get-auto-list 60s → 90s; cold-call для prod-аккаунта
  занимает до 21s, 60s обрезал реальные ответы. Per-request, global
  axios остаётся 30s.
- classifyLoadError: учитывать native code 'ETIMEDOUT' и 'ERR_NETWORK'
  + duration ≥ 0.9 * timeout как timeout, не network. Без этого UI
  ошибки на native показывал «Проверьте подключение», хотя реально
  это серверный таймаут.
- api.ts / api.web.ts: debug-логи (⬆️ ⬇️ ✗) под __DEV__ guard. В
  prod-build тихо, в dev/staging сохраняем для будущей диагностики.
- Tests: +кейсы classifyLoadError, +тест dedup updateUserDataOnly на
  native; existing 148 passing.
- Docs: ADR-024 в decision-log.md, dev-mobile.md дополнение,
  project-dashboard.md, tasks.md.

Plan: .claude/plans/2026-05-20-auto-list-native-parity.md
ADR-023 follow-up. Backend cold-aggregate остаётся узким местом —
отдельная задача когда backend будет переписан с perl на современный
стек.
```

`git push` — только по явной команде пользователя. Логично включить этот коммит в существующий PR #53 (он сейчас draft, ещё не мердж) — это естественное расширение ADR-023.

## Future work (out of this PR)

Записать в `.claude/tasks.md` как открытые задачи:
1. **Cross-call dedup `fetchAutoList` / `updateUserDataOnly`** — архитектурно предпочтительный вариант. Когда `fetchAutoList` уже в полёте, `updateUserData` не стартует, ждёт result и берёт `user_data` из него. Требует аккуратной координации AbortController'ов и mutation order. Отложено до переписывания backend.
2. **`/system-notice` dev-URL для физического Android device** — сейчас стучится в `10.0.2.2:8001` который на physical device никуда не разрешается; даёт 30s ERR_NETWORK на каждый poll. Можно либо отключить poll в dev на native, либо переключить URL через `adb reverse tcp:8001 tcp:8001` + `127.0.0.1`. Не блокер.
3. **Backend cold-aggregate `/get-auto-list`** — оставить как `#waiting/external-dependency`, ждём переписывания backend на современный стек. Текущие правки на клиенте максимально снижают нагрузку (один запрос вместо двух, dedup, разумный timeout).
