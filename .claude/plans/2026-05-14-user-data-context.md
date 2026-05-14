# Shared UserDataContext for web — deduplicate `/get-auto-list` between WebSidebar and AutoListScreen

## Status

**Implemented** (2026-05-14). Реализация в ветке
`feat/user-data-context` от master (после мержа ADR-019 фикса, коммит
`5dec998`). TS чист, ESLint без новых warning'ов, **19 suites / 125
tests passed** (+10 новых от UserDataContext, +0 регрессий). См.
**ADR-020** в `decision-log.md`. Закрывает Follow-up #2 плана ADR-018.

## Контекст и причина

`/get-auto-list` — самый «тяжёлый» endpoint в auth-зоне. На текущем web
он вызывается **двумя независимыми компонентами**:

1. **`WebSidebar.loadData()`** (`src/components/web/WebSidebar.tsx:155`)
   — `POST /get-auto-list` с `auto_list_limit: 0`. Триггеры:
   - Mount (line 202)
   - `pathname` change (line 202)
   - `document.visibilitychange` (line 208-215)
   - Successful `switchOrg` (line 281, fire-and-forget)
2. **`useAutoData.updateUserDataOnly()`**
   (`src/hooks/useAutoData.ts:630-656`) — тот же `POST /get-auto-list`
   с `auto_list_limit: 0`. Триггер: `useFocusEffect` в
   `AutoListScreen.web.tsx:62`.

При **открытии `/auto-list`** и **переходе между route'ами** оба
запроса летят **параллельно**. Каждый компонент держит свою копию
ответа (`userData`, `otherUserList`, `autoListCount`,
`ourServicesList`, `onboardingExpired`). `AbortController` смягчает
ситуацию для последующих кликов, но не для самого момента parallel-
fetch'а.

**Реальный риск, не только перформанс:** разорванный state уже
вызывал баг (PR #16 — `user_auto_count` в активной org показывался
неправильно потому что WebSidebar и AutoListScreen видели разные
снимки). После ADR-018/019 расхождение может стать заметнее с ростом
парков и фильтров.

Документация: `dev-web.md:462-466` явно фиксирует это как known minor
redundancy с предложением «lift `user_data` + `other_user_list` в
React Context, обе компоненты подписываются».

## Resolved decisions (2026-05-14)

| # | Вопрос | Решение |
|---|---|---|
| 1 | Архитектурный вариант | **Lighter Context** (Вариант B из research'а) — только shared поля (`userData`, `otherUserList`, `autoListCount`, `ourServicesList`, `onboardingExpired`) + fetcher `updateUserData()`. Не делаем full Context над `useAutoData` (вариант A — слишком инвазивно), не делаем чистый request-level dedup (вариант C — не решает разорванный state), не вводим React Query (вариант D — over-engineering для одной задачи). |
| 2 | Что НЕ кладём в Context | `autoList`, `filters`, `sortMode`, `sortBannerDismissed`, `cachedFullList`, флаги загрузки (`isLoading/isRefreshing/isSearching/isLoadingMore`) — screen-specific state, sidebar им не пользуется. Остаются локальными в `useAutoData`. |
| 3 | Направление синхронизации | **Двунаправленная**: (a) когда `WebSidebar` или `AutoListScreen.useFocusEffect` зовут `context.updateUserData()` — Context fetch'ит и обновляет себя; (b) когда `useAutoData.fetchAutoList()` (через `loadData/refreshData/loadMore`) возвращает свежий ответ — `useAutoData` пишет shared-поля в Context через `syncFromAutoList(data)`. Так sidebar мгновенно видит результат refresh'а списка авто, а screen видит результат visibility-change в sidebar. |
| 4 | In-flight dedup | `inFlightRef` в Provider хранит текущий `Promise<void>`. Второй concurrent caller получает тот же Promise без создания нового запроса. После resolve — `inFlight = null`. На unmount Provider — `controller.abort()`. |
| 5 | Кэширование TTL | **Нет TTL** на старте. Dedup только пока promise in-flight. TTL — premature optimization, добавим если метрики покажут проблему. |
| 6 | Платформенный scope | **Только web**. На native нет `WebSidebar` (там `LeftMenuModal` через props от `useAutoListScreen.tsx`). `useAutoData` на native продолжает работать как есть, без Context'а. `useUserData()` на native возвращает `null`-context (Provider не смонтирован) — `useAutoData` проверяет наличие и пропускает sync. |
| 7 | Mount point Provider'а | `app/(authenticated)/_layout.web.tsx` — обёртка `<UserDataProvider>` вокруг `<WebAppLayout>`. Так и `WebSidebar` (внутри layout), и `AutoListScreen.web` (children layout'а) — оба под одним provider'ом. На native есть свой `app/(authenticated)/_layout.tsx` — туда provider не добавляем. |
| 8 | Single Provider per app | Provider маунтится только в authenticated layout. Auth-страницы (`/`, `/onboarding`) не имеют доступа — и не должны (там нет user_data). |

## Цель

Один источник правды для `userData / otherUserList / autoListCount /
ourServicesList / onboardingExpired` на web. Один in-flight запрос
`/get-auto-list` с `auto_list_limit: 0` одновременно. WebSidebar и
AutoListScreen.web всегда видят одинаковый снимок этих полей.

После Phase 2 (когда backend подключит `sort_by`) ничего в Context'е
не меняется — это ортогональная задача.

## Архитектура

```
app/(authenticated)/_layout.web.tsx
└─ <UserDataProvider>          ← новый
   └─ <WebAppLayout>
      ├─ <WebSidebar>          ← consumer: useUserData()
      │   └─ нет своего state для shared полей,
      │       нет своего loadData(), вместо них
      │       читает context + зовёт context.updateUserData()
      │       на свои триггеры (mount, pathname, visibility, switchOrg)
      └─ children
         └─ <AutoListScreen.web>
             ├─ useAutoList() → useAutoData() (локальный)
             │   └─ при fetchAutoList success зовёт
             │       context.syncFromAutoList(data) — пишет в Context
             │       shared-поля из ответа /get-auto-list
             └─ useFocusEffect → context.updateUserData()
                 (заменяет вызов autoListHook.updateUserData())
```

### Контракт `UserDataContext`

```typescript
interface UserDataContextValue {
  // Shared snapshot
  userData: UserData;
  otherUserList: UserData[];
  autoListCount: number;
  ourServicesList: OurService[];
  onboardingExpired: number | string;

  // Lifecycle / refresh
  /**
   * Fetch /get-auto-list with auto_list_limit:0 and update snapshot.
   * Deduplicated: concurrent callers receive the same in-flight promise.
   */
  updateUserData(): Promise<void>;

  /**
   * Apply a /get-auto-list response received elsewhere (e.g. useAutoData
   * after a fetchAutoList call) to the shared snapshot. Lets useAutoData
   * keep its full-list fetch path while still keeping Context in sync.
   */
  syncFromAutoList(data: unknown): void;

  /**
   * Optimistic-swap helper used by switchOrg. Moves the target org from
   * otherUserList into userData (and vice-versa) before the background
   * refresh lands. Encapsulates the logic that lives inline in
   * WebSidebar.switchOrg today.
   */
  optimisticOrgSwap(targetInn: string): void;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children }) { ... }
export function useUserData(): UserDataContextValue { ... }
// throws if used outside Provider — fail loud
export function useOptionalUserData(): UserDataContextValue | null { ... }
// for useAutoData: returns null on native or auth screens
```

`useAutoData` использует **`useOptionalUserData()`** — если null, sync
пропускается (native / auth-зоны до Provider'а).

### Двунаправленная sync

**Context → screens:** consumer'ы (`WebSidebar`, `AutoListScreen.web`)
читают через `useUserData()` — react re-renders при изменении.

**`updateUserData()` (Context) → Context state:**
1. `if (inFlightRef.current) return inFlightRef.current` — dedup
2. `inFlightRef.current = ` создать `AbortController`, fetch, на
   resolve обновить state, set `inFlight = null`
3. Errors handled silently (sidebar non-critical)

**`useAutoData.fetchAutoList()` → Context (через `syncFromAutoList`):**
В существующем `useAutoData.ts` после `setUserData / setOtherUserList
/ setAutoListCount / setOurServicesList / setOnboardingExpired`
добавляем один вызов `optionalContext?.syncFromAutoList(data)`. Это
не вызывает повторный setState в `useAutoData` (мы НЕ читаем эти
поля обратно из Context на web; либо читаем — см. ниже).

**Важный design question:** должен ли `useAutoData` ЧИТАТЬ
`userData/otherUserList/autoListCount/ourServicesList/onboardingExpired`
из Context (и в этом случае убрать соответствующие `useState` в
самом хуке для web)? Два варианта:

- **(a) Mirror (проще):** useAutoData держит свой `useState` для
  shared полей, синхронизирует обе стороны (in → Context через
  `syncFromAutoList`; out → Context подписан через `useUserData()`,
  но эти значения useAutoData не использует, только sidebar). Тогда
  `useAutoData` не зависит от наличия Provider'а — работает как
  раньше на native. **Минус:** дублирование state, два setState на
  одно изменение, теоретическая возможность дрифта.
- **(b) Single source on web (чище):** useAutoData на web вообще не
  держит `userData/otherUserList/autoListCount/ourServicesList/
  onboardingExpired` локально — берёт из Context через
  `useOptionalUserData()`. На native — локальные `useState`.
  **Минус:** разная структура между платформами, потенциально
  ломает существующие тесты useAutoData (они не оборачивают
  Provider).

**Принимаю вариант (b) Single source on web** через internal
sub-hook `useSharedAutoListState()`:

```ts
function useSharedAutoListState() {
  const ctx = useOptionalUserData();   // null on native + auth zones
  // Local state always declared (Rules of Hooks) — used ONLY when ctx
  // is null. On web under provider it is allocated but never read/
  // written, so no drift surface exists.
  const [userDataLocal, setUserDataLocal] = useState<UserData>({...});
  const [otherUserListLocal, setOtherUserListLocal] = useState<UserData[]>([]);
  const [autoListCountLocal, setAutoListCountLocal] = useState<number>(0);
  const [ourServicesListLocal, setOurServicesListLocal] = useState<OurService[]>([]);
  const [onboardingExpiredLocal, setOnboardingExpiredLocal] = useState<number | string>(1);

  if (ctx) {
    return {
      userData: ctx.userData,
      otherUserList: ctx.otherUserList,
      autoListCount: ctx.autoListCount,
      ourServicesList: ctx.ourServicesList,
      onboardingExpired: ctx.onboardingExpired,
      applyFromAutoList: ctx.syncFromAutoList,
      setUserDataDirect: ctx.setUserData,  // for native sidebar parity APIs
      // ... narrow setter surface, see implementation
    };
  }
  return {
    userData: userDataLocal,
    otherUserList: otherUserListLocal,
    autoListCount: autoListCountLocal,
    ourServicesList: ourServicesListLocal,
    onboardingExpired: onboardingExpiredLocal,
    applyFromAutoList: (data: GetAutoListResponse) => {
      if (data.user_data) setUserDataLocal(data.user_data);
      if (data.other_user_list) setOtherUserListLocal(data.other_user_list);
      // ... etc; partial-aware (skip undefined keys)
    },
    setUserDataDirect: setUserDataLocal,
  };
}
```

**Почему это работает без поломок existing tests:**

- Тесты `useAutoData.test.tsx` запускаются под `jest-rn-stub.ts`
  (`Platform.OS === 'ios'`). `renderHook(() => useAutoData())` без
  обёртки `<UserDataProvider>` → `useOptionalUserData()` возвращает
  null → ветка native-path → local state как сейчас → все 15 case'ов
  работают бит-в-бит. **Ноль изменений в тестовом suite**.
- На web Provider маунтится в `_layout.web.tsx`, useAutoData ходит
  через ctx-ветку. Local state existses в памяти как unused remnant
  (~5 пустых `useState` слотов) — это цена «адаптивности к среде»
  без дублирования логики и без двух реализаций хука.
- На native Provider никогда не существует. Поведение бит-в-бит как
  сейчас.

**Цена сравнительно с (a) Mirror:** +~15 LOC в одном sub-hook'е,
вырастает поверхность useAutoData. Цена незначительная, выигрыш —
конструктивно невозможный drift и одна source-of-truth на web.

## Phase 1 — реализация (этот PR)

### Файлы

| Файл | Тип | Что меняем |
|---|---|---|
| `src/contexts/UserDataContext.tsx` | **new** | Provider + state + `updateUserData()` с in-flight dedup + `syncFromAutoList(data)` + `optimisticOrgSwap(inn)` + `useUserData()` + `useOptionalUserData()`. ~150 LOC. |
| `app/(authenticated)/_layout.web.tsx` | edit | Обернуть `<WebAppLayout>` в `<UserDataProvider>`. +2 LOC. |
| `src/components/web/WebSidebar.tsx` | edit | Удалить локальные `useState` для `userData/otherUserList/autoListCount/ourServices/onboardingExpired`. Удалить `loadData()` + `abortRef` + три useEffect'а (mount/pathname/visibility) — они теперь в Provider'е. Триггеры (mount/pathname/visibility/switchOrg) → `context.updateUserData()`. Optimistic-swap при switchOrg → `context.optimisticOrgSwap(inn)`. ~−80 / +20 LOC. |
| `src/hooks/useAutoData.ts` | edit | После каждого успешного `fetchAutoList` (один setState блок в конце) — `optionalContext?.syncFromAutoList(data)`. После `updateUserDataOnly` — тоже sync. Web-only через `useOptionalUserData()` (null на native — пропуск sync). +~10 LOC. |
| `src/screens/auto/AutoListScreen.web.tsx` | edit | В `useFocusEffect` заменить `autoListHook.updateUserData()` на `userDataContext.updateUserData()`. +2 / −1 LOC. |
| `src/contexts/__tests__/UserDataContext.test.tsx` | **new** | Tests: initial state, `updateUserData` fetch + state apply, in-flight dedup (two concurrent calls share promise), AbortController on unmount, `syncFromAutoList` applies external response, `optimisticOrgSwap` moves orgs between userData/otherUserList. ~15 test cases. |
| `Writerside/topics/dev-web.md` | edit | Раздел про sidebar data freshness переписать — теперь Context, один запрос, два consumer'а. Описать `useUserData()` API. |
| `Writerside/topics/decision-log.md` | edit | **ADR-020** «Shared UserDataContext for web» с context/decision/alternatives/consequences. |
| `Writerside/topics/project-dashboard.md` | edit | Recent Changes entry. |

**Не трогаем:**
- `AutoListScreen.tsx` (native) — Context не используется на native
- `useAutoList.ts` — продолжает оборачивать `useAutoData`, ничего не знает про Context
- `LeftMenuModal.tsx` (native) — продолжает читать props от
  `AutoListScreen.tsx` через `autoListHook.userData / otherUserList`
- Тесты `useAutoData.test.tsx` — не оборачиваются Provider'ом, на
  native-пути всё работает как раньше

### Тесты

**Новые** (`src/contexts/__tests__/UserDataContext.test.tsx`):
1. Initial state — пустые значения / 0
2. `updateUserData()` — fetch /get-auto-list with `auto_list_limit:0`,
   state обновляется из ответа
3. In-flight dedup — два concurrent `updateUserData()` → один fetch,
   оба получают тот же promise
4. AbortController — unmount во время fetch → abort, no setState on
   dead component
5. `syncFromAutoList(data)` — вызов с произвольным backend payload
   обновляет state (без сетевого запроса)
6. `optimisticOrgSwap(inn)` — `userData` ↔ `otherUserList[i]`
   меняются местами; `autoListCount` обновляется на
   `userData.user_auto_count` целевой org; де-промоутед org берёт
   старый `autoListCount` как `user_auto_count`
7. `useUserData()` throws if used outside Provider
8. `useOptionalUserData()` returns null outside Provider
9. Errors handled silently (sidebar non-critical) — fetch fail не
   крашит Provider, state остаётся в предыдущем валидном виде
10. 401 — token cleared by api interceptor (как в useAutoData test)

**Existing** (`src/hooks/__tests__/useAutoData.test.tsx`): не ломаются,
Provider не маунтится в их `renderHook` обёртках. `useOptionalUserData()`
возвращает null — путь sync пропускается.

### Phase 1 acceptance criteria

- ✅ Один `POST /get-auto-list` запрос с `auto_list_limit:0` при
  открытии `/auto-list` (не два)
- ✅ `WebSidebar` и `AutoListScreen.web` показывают одинаковый
  `userData`/`otherUserList`/`autoListCount`/`ourServicesList` без
  drift'а
- ✅ Switch org — optimistic swap работает как раньше (sidebar +
  screen обновляются вместе, background refresh потом)
- ✅ Pull-to-refresh на `AutoListScreen.web` — Context видит свежие
  shared-поля
- ✅ `visibilitychange` обновляет sidebar — и screen тоже видит
  результат
- ✅ Native поведение бит-в-бит как сейчас (никаких regression'ов в
  `LeftMenuModal` / native AutoListScreen)
- ✅ Все existing tests проходят
- ✅ Новых warning'ов в ESLint нет

## Откатываемость

- Полный revert PR убирает Provider и возвращает `WebSidebar` к
  локальному state + собственному `loadData()`. Поскольку
  `useAutoData` mirror'ит shared поля и в state, и в Context, на
  revert работает в одиночку как раньше.
- Можно отключить через feature flag (e.g. `Platform.OS === 'web' &&
  __ENABLE_USER_DATA_CONTEXT__`) — оверкилл для текущего scope, не
  оправдан.

## Открытые риски и митигации

| Риск | Вероятность | Митигация |
|---|---|---|
| `updateUserData()` и `useAutoData.updateUserDataOnly()` оба активны на web → всё равно 2 запроса | Низкая | В Phase 1 `AutoListScreen.web.useFocusEffect` зовёт **context.updateUserData()**, не `autoListHook.updateUserData()`. `updateUserDataOnly` на web становится no-op (или удаляется из web-пути). |
| Provider не маунтится в auth-зоне (`/`, `/onboarding`, `/pin`) → но какой-то компонент случайно использует `useUserData()` | Низкая | `useUserData()` throws с явным сообщением. Это намеренно — никаких silent-failures. Для опционального использования (как `useAutoData`) — `useOptionalUserData()` возвращает null. |
| Tests на web компонентах (если будут) требуют обёртку | Низкая | В test-utils добавить `renderWithUserData(children, initialValue?)` helper. На текущий момент component tests «out of scope until stable jest-expo» (jest config note), так что вопрос не насущный. |
| `syncFromAutoList` вызывается с partial response (e.g. без `other_user_list`) → стираем существующий список | Низкая | Внутри `syncFromAutoList` проверять наличие каждого поля и не записывать `undefined`. Тест на partial sync. |
| Coordination с ADR-017 (`lk.transapp.ru` cutover) | Низкая | Не связано. Один Provider работает на любом домене. |

## Follow-ups (не в этом PR)

1. **Phase 2 ADR-018** — backend `sort_by` параметр. Ортогонально
   этому Context'у, никакого влияния.
2. **Тесты компонентов** — когда jest-expo стабилизируется для SDK 54,
   добавить render-based тесты `WebSidebar` + `AutoListScreen.web`
   через `<UserDataProvider initialState={...}>`.
3. **TTL cache в `updateUserData`** — если метрики покажут, что
   visibility-change и mount происходят в окне < 500ms друг от
   друга и dedup не покрывает (например, mount → resolve → 100ms →
   visibilitychange), добавить short TTL (e.g., 1s) с invalidation
   на switchOrg / pull-to-refresh.

## Ссылки

- ADR-018 (sort toggle) + ADR-019 (auto_list_count fix) — соседние решения по `useAutoData`
- `Writerside/topics/dev-web.md:462-466` — изначальная фиксация известной избыточности
- `src/contexts/NotificationContext.tsx` — prior art для Provider паттерна
- Research: см. сессию агента, итог — Вариант B из 4 кандидатов
- PR #16 (`user_auto_count` asymmetry fix) — пример того, что разорванный state между WebSidebar и AutoListScreen уже приводил к багу
