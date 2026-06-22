# Клиентский рычаг `/get-auto-list`: «лёгкий» refresh шлёт `auto_list_limit:1` вместо `0`

Status: DONE 2026-06-21 (ADR-031). Реализовано `auto_list_limit:1` в обоих
лёгких call-site'ах; verification из плана пройдена; `tsc` чисто, `jest`
UserDataContext+useAutoData 41 тест зелёные. Снимает часть latency-боли до
миграции (backend-takeover), не трогая legacy Ивана.
Date: 2026-06-21
Trigger: ADR-030. Production-хендлер `digitrans/api/TPLApiController.pm:739`
раскрывает `auto_list_limit || 1000` → в Perl `"0" || 1000 = 1000`. «Лёгкий»
profile-refresh (`updateUserData` web / `updateUserDataOnly` native) шлёт
`auto_list_limit:0`, считая вызов дешёвым («только профиль»), но на бэкенде это
полный скан парка (≤1000 авто) × ~8–11 подзапросов/авто + внешний OSAGO-парсер
на авто без полиса. Легаси-фронты никогда не слали `0` (всегда `limit:10`).

## Проблема

`auto_list_limit:0` — самый дорогой вызов в приложении, маскирующийся под
самый дешёвый. Срабатывает на каждом page-load и переключении компании.
Дедуп ADR-028 убирает только конкурентный дубль (web sidebar↔screen), но
выживший вызов (на смене компании и на native) всё равно `0 → full-fleet`.

## Решение (минимальное, без расширения)

Слать `auto_list_limit: 1` вместо `0` в двух «лёгких» call-site'ах:
- `src/contexts/UserDataContext.tsx` — `updateUserData` (web, ~`:207`).
- `src/hooks/useAutoData.ts` — `updateUserDataOnly` (native, ~`:771-805`).

Перл при `"1" || 1000 = 1` ограничивает `LIMIT 0,1` → скан одного авто
вместо всего парка. Профиль/счётчик/списки приходят независимо от `LIMIT`:
`user_data`, `other_user_list`, `our_services_list`, `manager_data`,
`onboarding_*` — из `session_data`; `auto_list_count` — из `FOUND_ROWS()`
(полное число строк по фильтру, не зависит от страницы).

HEAVY `fetchAutoList` (экран) НЕ трогаем — он ведёт сам список и должен
грузить страницу/полный набор по `sortMode` как сейчас.

## Что обязательно проверить перед реализацией

1. **`syncFromAutoList` / `updateUserData` не читают `auto_list`** из ответа
   лёгкого вызова (по research — берут только `user_data`, `auto_list_count`,
   `other_user_list`, `our_services_list`; `auto_list` — screen-local). Если
   где-то лёгкий ответ всё же используется как источник списка — рычаг
   нельзя применять там без правки.
2. **`auto_list_count` остаётся корректным.** Лёгкий вызов идёт **без
   фильтров** (`auto_cancelled`/`auto_pass_*` пустые) → в перле `fits=1`
   всегда, decrement count'а в цикле не срабатывает → `FOUND_ROWS()` точен
   при любом `LIMIT`. (С фильтрами count корректируется по странице — но
   фильтры есть только у HEAVY, который не меняем.)
3. **native `updateUserDataOnly`** используется и при переключении
   организации (`set-current-inn` flow) — убедиться, что и там потребляется
   только профиль, а список перезагружает экран отдельно.

## Файлы

- `src/contexts/UserDataContext.tsx` — 1 строка (payload `auto_list_limit`).
- `src/hooks/useAutoData.ts` — 1 строка (payload `auto_list_limit`).
- Тесты: `src/contexts/__tests__/UserDataContext.test.tsx`,
  `src/hooks/__tests__/useAutoData.test.tsx` — добавить ассерт, что лёгкий
  вызов уходит с `auto_list_limit: 1`; существующие dedup-тесты держать
  зелёными.

## Verified

- [x] `npx tsc --noEmit` 0 errors
- [x] `npx jest` UserDataContext + useAutoData — 41 тест зелёные (web light-call
  и native dedup ассертят `auto_list_limit:1`)
- [x] Code-review consumers: `syncFromAutoList` и native `updateUserDataOnly`
  не читают `auto_list`; count из `FOUND_ROWS()`; лёгкий вызов без фильтров

## Что НЕ в этом плане

- Любые server-side изменения (миграция — отдельный epic backend-takeover).
- Изменение HEAVY `fetchAutoList`, пагинации, `sortMode`.
- Полный перенос `UserDataContext` на native.

## Документация при реализации

- ADR в `decision-log.md` (следующий свободный номер) — «client-side
  `auto_list_limit:0→1` lever (ADR-030 follow-up)».
- `dev-web.md` / `dev-mobile.md` — отметить в разделе про sidebar refresh.
- `tasks.md` — пометить `[x]` в том же коммите.
