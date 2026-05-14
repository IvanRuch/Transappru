# Auto list sort toggle (Алфавит / По номеру) + Phase 2 server-side sort

## Status

**Phase 1 implemented** (2026-05-14). Frontend-only часть готова, тесты
проходят (`18 suites / 113 tests passed`, +7 новых), TypeScript чист,
ESLint без новых warnings. Документация (`dev-mobile.md`, `dev-web.md`,
ADR-018, `project-dashboard.md`) обновлена. Готово к PR review и merge на
feature-ветку → master.

Phase 2 — после согласования параметра `sort_by` с legacy backend team
(separate repo `ivan.trans-konsalt.ru` API), без жёсткого дедлайна.

## Контекст и причина

Коммит `cb4b97d` (29 апреля 2026, «feat(auto): sort vehicle list by main
numeric segment of plate (#12)») ввёл клиентскую сортировку списка авто по
числовому сегменту ГРЗ через `sortAutoListByPlateNumber()`. Менеджеры
TransApp просили именно такой порядок — чтобы «150» шло перед «1500» а не
«1500» перед «160» как в лексикографической сортировке от backend'а.

При проектировании не учли, что `/get-auto-list` использует offset-based
пагинацию (`auto_list_from`, `auto_list_limit=10`) с дозагрузкой по
`FlatList onEndReached`. Backend сортирует страницы **лексикографически**.
Каждая дозагрузка → мердж новых авто в `autoList` → пересортировка всего
списка по цифрам → авто, которые юзер уже видел в верхней части, могут
сдвинуться вниз/вверх. На парках <100 авто это незаметно (≤2 страницы), на
парках 100+ — заметное «шевеление» при скролле.

**Текущая статистика парков (на 2026-05-14):**

| Размер парка | Кол-во клиентов |
|---|---|
| > 100 авто | 3 |
| 40–100 | 12 |
| < 40 | подавляющее большинство |
| Максимум | 150 авто (один клиент) |

Документация (`Writerside/topics/dev-mobile.md:110-117`) уже признаёт это
known limitation, отложено как «invisible at typical fleet sizes». Менеджеры
эпизодически валидировали и не успели массово столкнуться с проблемой —
домен `lk.transapp.ru` пока не переключён на новый стек (см. план
`2026-05-06-lk-transapp-cutover.md`), реальные клиенты живут на legacy web.

**Окно для исправления:** новой сортировкой ещё не пользовались реальные
юзеры, поэтому регрессионных рисков нет — можно менять дефолт и UX
свободно.

## Resolved decisions (2026-05-14)

| # | Вопрос | Решение |
|---|---|---|
| 1 | Архитектурный подход | Долгосрочно — **серверная сортировка** через параметр `sort_by` (Phase 2). Краткосрочно — клиентский UI toggle с **load-all стратегией** для режима «По номеру» (Phase 1). Не «жить с багом», а реально решить, пусть и через временный обход. |
| 2 | Размещение toggle | Внутри **`AutoCountToolbar`** (тонкая полоска над списком, «Всего N авто [Добавить авто]»). Toggle вставляется между счётчиком и кнопкой. На узких экранах — переносится на вторую строку. Изначально планировали `FindAutoPanel`, но он оказался модальным окном фильтров — toggle там не был бы виден без открытия модалки. `AutoCountToolbar` всегда виден над списком, семантически правильное место (контролы списка). Шапка экрана не загромождается. |
| 3 | Лейблы | Префикс «**Сортировка по**» + сегмент-контрол с genitive-опциями «**алфавиту**» / «**номеру**». Грамматически читается естественно. Без иконок (`A↓` / `1↓` неоднозначны без контекста). |
| 4 | Persist scope | **Глобально** (один ключ на юзера), не per-organization. Persist через `AsyncStorage`. |
| 5 | Дефолтный режим | **«Алфавит»** (`lexicographic`) — first-paint совпадает с legacy-поведением, load-all-цена платится только при opt-in. Менеджеры могут переключиться одним кликом на «по номеру». Info-banner про load-all показывается только тем, кто включил `plate_digits`. (Изначально планировали `plate_digits` как дефолт; пересмотрено в ходе review — лучше тихий стандартный режим + opt-in.) |
| 6 | Стратегия Phase 1 для режима «По номеру» | **B1 (load-all)**: один запрос с `auto_list_limit = auto_list_count`. Не B2 (background batching) — переусложнение под текущие парки (макс 150 авто = ~80–200 KB ответ, ~1–2с на сети). |
| 7 | Порог load-all | **Без хардкодного порога** на старте — все текущие парки помещаются в один запрос. Если в будущем появится клиент с 1000+ авто, и метрики покажут проблему — добавим batching отдельным follow-up'ом. |
| 8 | Info-banner про улучшение | **Да, в режиме «По номеру»**: «Сортировка применяется ко всему парку. В следующей версии скорость улучшится за счёт серверной сортировки». Dismissible, persist через `AsyncStorage`. Удаляется из кода после Phase 2. |

## Цель

Дать юзерам надёжный выбор между двумя порядками сортировки списка авто:

- **«Алфавит»** — серверный лексикографический порядок, стабильный при дозагрузке (текущее поведение до коммита `cb4b97d`)
- **«По номеру»** — клиентская сортировка по числовому сегменту ГРЗ, стабильная при скролле благодаря load-all стратегии

Выбор persist'ится глобально на юзера. Дефолт — «По номеру» (раз менеджеры
просили). UI один и тот же для mobile и web, поведение идентично (один
shared hook + один shared sub-component по ADR-003/ADR-005).

После Phase 2 нагрузка от load-all убирается, оба режима используют обычную
постраничную пагинацию, разница только в параметре `sort_by` в запросе.

## Архитектурное решение

### Phase 1 — frontend-only (без участия backend)

**Компоненты:**

1. **`SortToggle.tsx`** (новый, `src/components/auto/SortToggle.tsx`) —
   shared сегмент-контрол на два состояния. Принимает `mode: 'plate_digits'
   | 'lexicographic'` и `onChange: (mode) => void`. Без `Platform.OS`
   forking внутри — на mobile стандартный View+Pressable, на web стандартный
   же View+Pressable (react-native-web рендерит как `<div>` с `role="radio"`
   через `accessibilityRole`). Один компонент.

2. **`FindAutoPanel.tsx`** — вставляем `<SortToggle>` справа от поля поиска.
   На узких экранах (`flexWrap` или явный breakpoint через
   `useWindowDimensions`) переносится на следующую строку.

3. **`useAutoData.ts`** — расширяем state:
   - `sortMode: 'plate_digits' | 'lexicographic'` (default `'plate_digits'`)
   - `setSortMode(mode)` — переключатель, который:
     - сохраняет значение в `AsyncStorage` (ключ `ta_sort_mode`)
     - сбрасывает offset
     - инициирует перезагрузку с правильной стратегией для нового режима
   - hydrate `sortMode` из `AsyncStorage` при mount (до первого
     `fetchAutoList`)
   - **Стратегия запроса** зависит от `sortMode`:
     - `'lexicographic'` → обычная пагинация: `auto_list_limit=10`,
       `onEndReached` активен, клиентская сортировка не применяется
     - `'plate_digits'` → load-all: первый запрос с заведомо большим
       `auto_list_limit` (например `1000`) либо двух-этапно (сначала
       `limit=1` чтобы получить `auto_list_count`, потом `limit=count`) —
       выберу по факту в реализации, оптимизирую для одного запроса.
       `onEndReached` — no-op в этом режиме. Клиентский
       `sortAutoListByPlateNumber()` применяется к полному результату один
       раз.

4. **`InfoBanner.tsx`** (новый, либо переиспользовать `useState`-based
   баннер inline) — над списком, только в режиме `'plate_digits'`,
   dismissible. Persist факта dismissal в `AsyncStorage` (ключ
   `ta_sort_banner_dismissed=1`).

**Какое API клиент не меняет:**

- `/get-auto-list` параметры остаются те же
- Backend не трогаем
- Все существующие фильтры (`auto_str`, `auto_cancelled`, `auto_pass_ended`,
  `auto_pass_ends`, `auto_pass_ends_until_date`) работают как сейчас

**Поведение фильтров в режиме «По номеру»:**

Юзер ставит фильтр → `setFilterValue()` → `offset=0` → новый запрос с
`auto_list_limit = ?`. Здесь два варианта:

- A) Сначала запрос с `limit=1` чтобы получить новый `auto_list_count`,
  потом второй запрос с `limit=count` — два round-trip'а, но запросы лёгкие
- B) Сразу один запрос с `limit=1000` (или другим большим числом) — один
  round-trip, backend в любом случае не отдаст больше чем есть

Выберу **(B)** — один запрос проще и быстрее. `1000` как safety upper bound,
который backend всё равно сократит до реального count.

**Кэш `cachedFullList` (`useAutoData.ts:217-226`):**

Уже существует. Расширяем семантику: кэш валиден, когда `sortMode ===
'plate_digits'` И нет активных фильтров. При переключении на «Алфавит» — НЕ
используем кэш (там полный массив, а нам в lexicographic режиме нужна
постраничная пагинация). При возврате на «По номеру» без фильтров — можем
использовать кэш если timestamp свежий (TTL уже есть в коде, проверю
значение в реализации).

### Phase 2 — координация с backend (когда они доступны)

**Изменения на стороне backend (legacy `ivan.trans-konsalt.ru`):**

- Параметр `sort_by: 'lexicographic' | 'plate_digits'` в `/get-auto-list`
- При `sort_by='plate_digits'`: SQL `ORDER BY` по выражению, извлекающему
  первый digit-run из `auto_number` как INT, и `auto_number` как
  tie-breaker. Точный синтаксис — на усмотрение backend team (PostgreSQL
  `regexp_replace` + `CAST`, либо stored function, либо вычисляемая
  колонка). С нашей стороны нужен только результат, согласованный с
  `compareByPlateNumber()` в `plateHelpers.ts`.
- Дефолт `sort_by` на backend'е — `'lexicographic'` (обратная совместимость
  для других клиентов, если такие есть).
- Желательно индекс на выражении сортировки для произвдительности на больших
  парках.

**Изменения frontend в Phase 2 PR:**

1. `useAutoData.ts`:
   - Убираем load-all логику для `plate_digits` режима — оба режима
     возвращаются к стандартной пагинации `limit=10` + `onEndReached`
   - В `fetchAutoList()` добавляем параметр `sort_by` (или
     `'plate_digits' as const` если режим = `'plate_digits'`, иначе не
     передавать → backend применит дефолт)
   - Убираем вызовы `sortAutoListByPlateNumber()` (или оставляем как
     идемпотентный safeguard — `sort` уже отсортированного массива O(n), не
     критично)
2. Удаляем info-banner и связанный `AsyncStorage` ключ
3. `plateHelpers.ts` — оставляем как есть; функция полезна для tests и
   потенциальных других нужд

**UX-инвариант между Phase 1 и Phase 2:**

Для юзера переход бесшовный. Toggle, лейблы, persist выбора и видимое
поведение списка идентичны. Меняется только то, что в режиме «По номеру»
исчезает спинер длинного первого запроса и появляется обычная плавная
дозагрузка по скроллу.

## Phases (детально)

### Phase 1 — UI toggle + load-all стратегия (frontend-only)

**PR scope:**

| Файл | Тип | Что меняем |
|---|---|---|
| `src/components/auto/SortToggle.tsx` | new | Shared сегмент-контрол «Алфавит / По номеру», стилизация по NativeWind, accessibility (`role="radiogroup"` через `accessibilityRole`) |
| `src/components/auto/index.ts` | edit | Экспорт `SortToggle` |
| `src/components/auto/FindAutoPanel.tsx` | edit | Слот для `<SortToggle>` справа от поля поиска, responsive wrap |
| `src/hooks/useAutoData.ts` | edit | `sortMode` state + persist + load-all стратегия для `plate_digits` + info-banner dismiss state |
| `src/hooks/useAutoList.ts` | edit | Пробрасываем `sortMode`, `setSortMode`, `bannerDismissed`, `dismissBanner` наверх к экранам |
| `src/screens/auto/AutoListScreen.tsx` | edit | Подключение `SortToggle` через `FindAutoPanel` + рендер `InfoBanner` |
| `src/screens/auto/AutoListScreen.web.tsx` | edit | То же, что и на mobile (компонент shared) |
| `src/components/auto/SortBanner.tsx` или inline в screen | new | Info-banner с текстом про следующую версию, dismissible |
| `src/utils/plateHelpers.ts` | no change | Уже есть `sortAutoListByPlateNumber()` |
| `src/components/auto/__tests__/SortToggle.test.tsx` | new | Render + toggle + accessibility |
| `src/hooks/__tests__/useAutoData.test.tsx` | edit | Новые тесты: load-all в режиме `plate_digits`, switch между режимами, persist через mocked AsyncStorage, фильтры в каждом режиме |
| `Writerside/topics/dev-mobile.md` | edit | Раздел «Auto list ordering» — переписать с описанием toggle, load-all стратегии, плана Phase 2 |
| `Writerside/topics/dev-web.md` | edit | Кросс-ссылка на dev-mobile, упоминание `FindAutoPanel` shared toggle |
| `Writerside/topics/decision-log.md` | edit | Новый **ADR-018: «Auto list sort modes — UI toggle + server-side sort migration»** |
| `Writerside/topics/project-dashboard.md` | edit | Прогресс + дата, согласно правилу проекта |

**Тесты Phase 1:**

- Unit: `SortToggle` рендерит оба state, эмитит правильный mode
- Unit: `useAutoData` — переключение `sortMode` запускает правильный
  запрос (load-all для `plate_digits`, обычная пагинация для
  `lexicographic`)
- Unit: `useAutoData` — persist `sortMode` в `AsyncStorage` при изменении,
  hydrate при mount
- Unit: `useAutoData` — info-banner dismissible, факт dismissal persist'ится
- Integration: фильтр в режиме `plate_digits` перезагружает с
  `limit=large`, фильтр в `lexicographic` — обычная страничная загрузка
- Manual QA (`Writerside/topics/manual-qa-checklist.md`): два сценария
  смены режима, два сценария фильтрации в каждом режиме

**Acceptance criteria Phase 1:**

- ✅ Юзер видит toggle «Алфавит / По номеру» в `FindAutoPanel` на обеих
  платформах
- ✅ Дефолтный режим — «По номеру»
- ✅ В режиме «По номеру» список загружается одним запросом, скролл не
  вызывает шевеления
- ✅ В режиме «Алфавит» поведение идентично состоянию до коммита `cb4b97d`
  (постраничная пагинация, server-order)
- ✅ Фильтры (поиск по ГРЗ, чекбоксы пропусков, date-picker) работают
  корректно в обоих режимах
- ✅ Выбор режима сохраняется между сессиями и платформами одного юзера
- ✅ Info-banner в режиме «По номеру» появляется при первом включении,
  скрывается по клику на крестик, не возвращается после refresh

### Phase 2 — server-side `sort_by` (требует backend)

**Pre-requisites:**

1. Согласование с backend team параметра `sort_by` и SQL-реализации
2. Backend выпускает change на staging, мы тестируем
3. Backend выпускает change на prod

**PR scope:**

| Файл | Тип | Что меняем |
|---|---|---|
| `src/hooks/useAutoData.ts` | edit | Убираем load-all стратегию + передаём `sort_by` параметр в `/get-auto-list` когда `sortMode==='plate_digits'` |
| `src/hooks/useAutoData.ts` | edit | Убираем вызовы `sortAutoListByPlateNumber()` (опц.: оставить как safeguard) |
| `src/components/auto/SortBanner.tsx` (или inline) | delete | Banner удаляется из кода |
| `src/hooks/useAutoData.ts` | edit | Удаляем `bannerDismissed` state и `AsyncStorage` ключ `ta_sort_banner_dismissed` |
| `src/utils/plateHelpers.ts` | no change | Функция остаётся (потенциальное переиспользование) |
| `src/hooks/__tests__/useAutoData.test.tsx` | edit | Обновить тесты — теперь оба режима используют пагинацию, `sort_by` параметр верифицируется в mock-вызовах axios |
| `Writerside/topics/dev-mobile.md` | edit | Обновить раздел Auto list ordering — load-all больше нет, server-side sort |
| `Writerside/topics/decision-log.md` | edit | Добавить amendment к **ADR-018** или **ADR-019: «Auto list server-side sort by plate digits»** |
| `Writerside/topics/project-dashboard.md` | edit | Прогресс + дата |

**Acceptance criteria Phase 2:**

- ✅ Backend поддерживает `sort_by: 'plate_digits'` и возвращает страницы в
  правильном цифровом порядке
- ✅ В обоих режимах используется обычная пагинация `limit=10` +
  `onEndReached`
- ✅ Скролл в режиме «По номеру» при больших парках не загружает все авто
  разом → нет длинного первого запроса
- ✅ Info-banner про «следующую версию» удалён
- ✅ Реальный QA на парках 100+ авто (если есть тестовые) — порядок
  страниц правильный, дозагрузка плавная

## Откатываемость

**Phase 1:**

- Полный revert PR убирает toggle, load-all, banner. Дефолт юзера в
  `AsyncStorage` остаётся, но не используется → безопасно
- Можно отключить toggle через feature flag если решим катить аккуратно
  (доп. сложность, для текущего scope не оправдано — изменение
  изолировано)

**Phase 2:**

- Если backend выкатил `sort_by` с багом → revert frontend PR возвращает к
  Phase 1 поведению (load-all для «По номеру»)
- Если backend откатил `sort_by` → frontend PR продолжает работать
  (параметр игнорируется backend'ом, дефолт = `lexicographic`),
  но в режиме `plate_digits` юзер увидит лексикографический порядок страниц
  пока не доскроллит до конца. Для митигации можно держать клиентский
  `sortAutoListByPlateNumber()` как safeguard и оставить в Phase 2 — это и
  будет «temporary regression to Phase 1 без load-all», что приемлемо

## Открытые риски и митигации

| Риск | Вероятность | Митигация |
|---|---|---|
| `auto_list_limit=1000` блокируется backend'ом (hard cap) | Низкая (легаси сервис принимает большие limit'ы в практике) | Сначала dry-run с `limit=200` против staging → проверить ответ. Если cap — двухэтапная схема (`limit=1` → `limit=count`) |
| Тяжёлый ответ на парке 150 авто (>500KB) | Низкая | Замерить размер на проде через DevTools. Если значимо — gzip уже работает на nginx (`gzip on` в `nginx.prod.conf`); axios timeout 30s достаточен |
| Юзер с двумя ИНН в одной сессии хочет разный режим | Маркер | Решено как глобально (Resolved decision #4). Если станет реальной жалобой — переключить на per-organization persist (ключ `ta_sort_mode_${inn}`) — изменение в одной точке |
| Backend никогда не выкатит `sort_by` | Средняя (другая команда, другие приоритеты) | Phase 1 — самодостаточное решение. Phase 2 — оптимизация, не обязательное продолжение |
| Coordination с ADR-017 (`lk.transapp.ru` cutover) | Низкая | Не блокирует и не блокируется этим планом. Фронт работает на любом домене одинаково |

## Follow-ups (отдельные задачи, не часть этого плана)

1. **`useAutoData.ts:238-245`** — странная логика переписи `autoListCount`
   на `newItems.length` при фильтрах на первой странице. Может приводить к
   преждевременной остановке дозагрузки в режиме «Алфавит» при определённых
   фильтрах. Отдельный issue → отдельный PR. Не блокирует этот план.
2. **`/get-auto-list` дублирование между `WebSidebar` и `AutoListScreen`**
   (`dev-web.md:462-466`) — известная минорная избыточность. Митигация
   через `AbortController` уже есть. Если станет проблемой —
   lift `user_data` + `other_user_list` в React Context.
3. **Cursor-based пагинация** (`/get-auto-list` через `next_cursor` вместо
   `offset`) — долгосрочный API redesign. Не часть этого плана.
4. **Native поддержка sort_by** после Phase 2 — mobile уже использует тот
   же `useAutoData`, поэтому изменение автоматически применяется. Никаких
   дополнительных native action items.

## Ссылки

- Коммит `cb4b97d` — оригинальная клиентская сортировка по plate digits
- `Writerside/topics/dev-mobile.md:75-125` — текущее описание Auto list
  ordering (будет переписано в Phase 1)
- `Writerside/topics/dev-web.md` — раздел Feature Parity + FindAutoPanel
- `src/utils/plateHelpers.ts` — `sortAutoListByPlateNumber()`,
  `compareByPlateNumber()`, `plateSortKey()`
- `src/utils/__tests__/plateHelpers-sort.test.ts` — 11 test cases для
  сортировки (остаются актуальны и после Phase 2)
- `.claude/plans/2026-04-23-auto-list-redesign.md` — предыдущий план по
  редизайну списка (контекст, не зависимости)
- `.claude/plans/2026-05-06-lk-transapp-cutover.md` — план по переключению
  домена (параллельная работа, не блокирует)
