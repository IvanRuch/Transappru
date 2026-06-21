# Захват и миграция legacy backend (`base13`) в нашу инфраструктуру

Status: RCA скорректирован 2026-06-21 (ADR-030) — найден **реальный**
production-хендлер `htdocs/digitrans/api/TPLApiController.pm:739` (ADR-027/029
анализировали мёртвый `htdocs/api/TPLApiController.pm:442`, который отдаёт лишь
`{token, auto_list}` и не может обслуживать фронт). Хендлер УВАЖАЕТ `LIMIT ?, ?`,
но `auto_list_limit || 1000` → в Perl `"0" || 1000 = 1000`, поэтому
`auto_list_limit:0` раскрывается в **полный парк (≤1000)**. На КАЖДОЕ авто —
~8–11 подзапросов (in-work статус + `debt_sum` на `rosexport`, passes/fines/
diagnostic/osago/avtodor/rnis) + **внешний HTTP-вызов OSAGO-парсера**
(`get_parser_api_osago`) на авто без полиса, синхронно в цикле. Доминирующий
**триггер — клиентский**: «лёгкий» `updateUserData(auto_list_limit:0)`
(web-сайдбар + native) на каждом page-load и переключении компании раздувается
в полный скан; легаси-фронты всегда слали `limit:10` и никогда `0` → не
триггерили. БД быстрая (RT 0.22мс). **Политика: прод Ивана НИКОГДА не трогаем**
— фикс это миграция. Дешёвый клиентский рычаг (не трогая legacy): слать в
«лёгком» вызове `limit:1` вместо `0` (профиль/счётчик приходят независимо от
LIMIT) — сильнее дедупа ADR-028.
(Прежние статусы: 2026-06-20 контеншн-модель — ADR-027; 2026-06-21 «интрисивный
оверхед на 3-подзапросном N+1» — ADR-029; оба построены на неверном файле, см.
correction-notes.)
Date: 2026-06-18 (RCA 2026-06-20, скорр. 2026-06-21 ADR-030)
Trigger: инцидент 2026-06-18 — `/get-auto-list` отдаёт `AxiosError: timeout
of 90000ms exceeded` на mobile и web (`lk.transapp.ru`); при переключении
компании — бесконечная загрузка и «Список авто пуст». В ходе инцидента
получен SSH-доступ к backend Ивана, вскрыта топология и установлен механизм
(§ Phase 0): неизменный с конца 2025 perl-хендлер `get_auto_list` с N+1
выступает усилителем, а регрессию запустило изменившееся окружение (рост
латентности общего MySQL и/или рост данных). Прежняя гипотеза (cron
lock-wait, `tasks.md` resilience) — опровергнута.

## 1. Топология «как есть» (по ответу сисадмина 2026-06-18)

Публичный фронт-nginx `185.76.253.6` (`transapp.ru`) маршрутизирует по
location:

```
                 client (mobile / web lk)
                          │
            ┌─────────────┴───────────────┐
            │   mobile → transapp.ru/api   │
            │   web    → lk.transapp.ru/api│ (наш YC nginx 81.26.191.68
            │            → upstream         │  проксирует /api → transapp.ru)
            └─────────────┬───────────────┘
                          ▼
            185.76.253.6  (front nginx, Иван)
                          │
        location /api ────┼──── proxy_pass http://base13       ← REAL BACKEND
                          │                                       (perl + MySQL,
                          │                                        cron-воркеры)
        location /   ─────┴──── proxy_pass http://192.168.0.33:23001
                                (docker SPA, «всего два» docker-хоста,
                                 docker.trade.su; allow-list 2 IP)
```

Ключевые факты (уточнено после доступа 2026-06-20):
- **`base13`** = `base13.trade.su` (`185.76.253.253`), ssh порт `7023`,
  **Debian 7 (wheezy), kernel 3.2, OpenSSH 6.6** — EOL-система. App-сервер:
  Apache (prefork, `MaxClients 500`) + mod_fcgid/mod_perl, perl-приложение
  **`/www/tplnew/`** (под SVN). Хендлер `/api/*` —
  `/www/tplnew/htdocs/api/TPLApiController.pm`. Cron-воркеры —
  `/www/tplnew/cron_scripts/`. Access-log — `/www/log/tplnew-access.log`.
- **MySQL — НЕ на base13**, а на отдельном хосте `192.168.0.121`
  (descriptor user `rosexport`, схема **`trans_konsal`**) — общий инстанс с
  десятками БД trade.su (`max_connections=4048`, в моменте 363 коннекта,
  наблюдался соседний запрос на 766с).
- Вход на `base13` — user `grizodubov`, пароль «common», тот же что у
  `web01`. Пароль у сисадмина, в репо/план НЕ записываем.
- `/` (веб-SPA) обслуживают два docker-хоста (`docker.trade.su`, внутр.
  `192.168.0.33:23001`), доступ ограничен allow-list IP (`91.200.29.122`,
  `109.94.2.150` — предположительно наши офис/VPN).
- Внутренняя сеть `192.168.0.0/24`. Вся инфра — экосистема `trade.su`
  (та же, где `tradesu-moderator`; общий YC-folder
  `b1g2p4bd4r3v0ggge11d`).

Расхождение для проверки: сисадмин прислал nginx-конфиг с заголовком
`server_name lk.transapp.ru` (где `/api → base13`, `/ → docker`). Но
`lk.transapp.ru` после cutover 2026-05-14 (ADR-017) ведёт на наш YC VM
`81.26.191.68`. Вероятно это устаревший vhost на сервере Ивана (мёртвый,
A-запись уже не ведёт сюда), либо подписан по памяти. Логика
маршрутизации описывает `transapp.ru`, куда реально попадает наш
upstream-проксированный `/api/`.

## 2. Phase 0 — Инцидент `/get-auto-list`: RCA подтверждён (2026-06-20)

Диагностика проведена по доступу к base13. Корень найден; решение —
**legacy НЕ патчим**, фикс идёт через миграцию (Phases 1–4).

**Цепочка доказательств:**
1. Лог `/www/log/tplnew-access.log` (`%T` в секундах): `/api/get-auto-list`
   реально отрабатывает 129с, 144с, до **1444с**. Клиент таймаутит на 90с
   → «Не удалось загрузить». Тёплый повтор — 0с.
2. В топ-30 самых медленных запросов — **только `get-auto-list`**. Другие
   эндпоинты (включая скрейпинг `get-auto-check-*` со `sleep(10)`) не
   тормозят → это не общая нехватка воркеров Apache (`MaxClients 500`).
3. Код хендлера `get_auto_list` (`TPLApiController.pm:442`) — классический
   **N+1**: 1 запрос списка авто (`user_auto WHERE user_id=?`), затем на
   **каждое** авто три под-запроса (`_get_check_passes_string` →
   `user_auto_pass`, `_get_check_fines_string` → `COUNT/SUM user_auto_fine`,
   `_get_check_diagnostic_card_string` → `user_auto_diagnostic_card`) плюс
   `TPLApiUtils::time_left` на каждый пропуск.
4. Все эти запросы **индексированы** (`KEY user_auto`, `KEY user_id` —
   проверено по `legacy/SHOW CREATE TABLE.txt`) → поодиночке быстрые.
5. `ex_SQL_ar` использует persistent handle (без реконнекта на вызов),
   внешних HTTP-вызовов в `get_auto_list` нет, `sleep` нет.

**Важно (что НЕ менялось):** код бэкенда Ивана неизменен с конца 2025;
в этот период legacy и наши apps/web успешно работали с ним. Менялись
только мы (cutover lk, поллинги). Фирм с большим автопарком почти нет
(тест-аккаунт: 6 / 14 / 74 / 50 авто). Значит N+1 сам по себе — **не
триггер**, а **усилитель**: он делает `get_auto_list` самым чувствительным
к латентности БД эндпоинтом (больше всех round-trip'ов), поэтому именно он
«канарейка», а остальные ещё живут.

**Замеры с base13 (2026-06-20, нормальное окно):**
- 500× `SELECT 1` по persistent-коннекту = **0.136с** (~0.27мс/round-trip);
- `COUNT/SUM` по всей `user_auto_fine` (487k строк) = **83мс**.
→ БД и сеть в норме быстрые. Для 74 авто (~370 round-trip) `get_auto_list`
в нормальном окне ≈ доли секунды (= «тёплый повтор 0с», «раньше работало»).
Значит 130…1444с возникают **только в окна интермиттентного контеншна**
общего MySQL; размер данных и индексы ни при чём (487k свёртываются за
83мс) — гипотеза «рост данных» **опровергнута замером**.

**Декомпозиция факторов:**

| Фактор | Роль | Сторона |
|---|---|---|
| Интермиттентный контеншн общего MySQL `192.168.0.121` (соседи trade.su: 766с-запрос, 363 коннекта) | **триггер** | внешнее (trade.su/Иван) |
| N+1 в `get_auto_list` (неизменный код) | усилитель → канарейка | legacy |
| Конкурентные дубль-вызовы `get-auto-list` (2+ разом; в логе пары 418+1444, 129+144) | усилитель + самоконтеншн | **НАША** |

**Рычаги:**
- наш (без правки legacy): дедуп конкурентных `get-auto-list`
  (`tasks.md` cross-call dedup) — убирает самоконтеншн пары запросов;
- полный фикс: миграция (наш Postgres без шумных соседей + set-based
  вместо N+1).

Пустой `SHOW PROCESSLIST` при зависании согласуется с контеншн-моделью:
время уходит в окне, когда соседи насыщают общий инстанс, а не в выполнение
наших (быстрых) запросов.

**Усугубляющий фактор:** в `get_auto_list` и хелперах забыта отладка —
`open >/tmp/dump_15_09_001` + по ~8 вызовов `Data::Dumper->Dump(...)` с
записью в файл на КАЖДОЕ авто внутри цикла (конкурентные запросы
перетирают один файл).

**Опровергнуто:** гипотеза cron lock-wait (`check_avtodor`/`check_rnis`) —
инцидент идёт вне cron-окон, processlist чист, запросы индексированы.

**Решение (по решению 2026-06-20): НЕ трогаем legacy-perl Ивана.**
Правильный фикс (set-based агрегация вместо N+1) делаем уже в нашем
Litestar-бэкенде при миграции (Phases 1–4). Клиентская сторона выжата
максимум (ADR-023/024/026). До миграции деградация остаётся как known
issue.

### 2.1. Correction Phase 0 (2026-06-21, ADR-030) — реальный хендлер и триггер

При сборке полного контракта ответа для Phase 3 producer перестал совпадать
с consumer'ом. Пункты 3 и 5 выше построены на **неверном файле**
`htdocs/api/TPLApiController.pm:442` — он кодирует только `{token, auto_list}`
и три строки на авто, без `LIMIT`; фронт на нём не заработал бы. Поправки:

- **Production-хендлер** — `htdocs/digitrans/api/TPLApiController.pm:739`. Его
  верхнеуровневая сборка (`:1020-1032`) отдаёт ровно потребляемый контракт
  (`user_data`, `auto_list_count`, `other_user_list`, `our_services_list`,
  `onboarding_*`, `manager_data`), причём identity-поля приходят из
  `session_data` (auth-middleware), а не из самого `get_auto_list`.
- **Лимит УВАЖАЕТСЯ**, но `auto_list_limit || 1000` (`:778`); в Perl
  `"0" || 1000 = 1000` → `auto_list_limit:0` = полный парк (≤1000).
- **~8–11 подзапросов на авто** (не три): in-work статус `rosexport.tpl_card`
  (`:836`), `debt_sum` `rosexport` (`:869`), и шесть хелперов (`:903-1008`) —
  passes (`user_auto_pass`), fines (`COUNT/SUM user_auto_fine`, +2 ФССП/Платон
  при долге), diagnostic-card, osago, avtodor, rnis.
- **Внешний HTTP есть**: `_get_check_osago_data` (`:5431`) при отсутствии
  полиса зовёт `TPLApiUtils::get_parser_api_osago` (`:5468`) — синхронно,
  на каждое авто без ОСАГО, прямо в цикле. (Утверждение п.5 «внешних HTTP
  нет» относилось к другому файлу.)
- **Доминирующий триггер — клиентский**: «лёгкий» `updateUserData(auto_list_limit:0)`
  (web-сайдбар + native `updateUserDataOnly`) раздувается в полный скан
  ×~8–11 подзапросов + внешние OSAGO-вызовы, на каждом page-load и
  переключении компании. Легаси-фронты всегда слали `limit:10` и никогда
  `0`. Это объясняет field-наблюдение: тормозит независимо от аккаунта
  (сканируется весь парк любого) и воспроизводится на произвольном
  переключении компаний.
- **Корректный фактор-картинг**: триггер не «контеншн БД» и не «account data
  size», а раскрытие `limit:0 → 1000` клиентом поверх хендлера со стоимостью
  `~8–11 SQL × autos + внешний OSAGO × autos`.
- **Открытая верификация (Phase 1)**: в зеркале есть оба контроллера
  (`htdocs/api/` и `htdocs/digitrans/api/`); подтвердить на `base13`, какой
  `TPLApiController` Apache грузит для `location /api` (vhost / `PerlRequire`).

## 3. Phase 1 — Доступ и инвентаризация

- Получить и зафиксировать (в наш секрет-стор, НЕ в репо): SSH/доступ к
  `base13`, фронт-nginx `185.76.253.6`, docker-хостам, `web01`.
- Снять полную инвентаризацию `base13`: ОС, версия perl, веб-сервер
  (apache/nginx + как запускается perl — CGI/FastCGI/mod_perl/PSGI?),
  MySQL версия и схема (сверить с `legacy/SHOW CREATE TABLE.txt`),
  crontab, внешние интеграции и их креды (SMS-шлюз, Avtocod, MOS.RU,
  Yandex Maps, Kazna prod, источник РНИС/parkmon, FCM server key).
- Зафиксировать сетевую модель: как `base13` доступен (только из
  `192.168.0.0/24` через bastion `185.76.253.6` или есть VPN), где MySQL
  (на `base13` или отдельный хост).

## 4. Phase 2 — Зеркало данных

- Реплика/регулярный дамп MySQL legacy → наш Postgres (или временно MySQL
  под нашим контролем). Объёмы: `user_auto_avtodor` ~1.5M, `notification`
  ~910k, `user_auto_fine` ~487k, `user_auto_pass` ~390k.
- Решить engine назначения: payment-service уже на Postgres 15 — логично
  consolidate, но схема legacy MySQL объёмна (см. `legacy/SHOW CREATE
  TABLE.txt`); миграция схемы — отдельная задача.

## 5. Phase 3 — Переписать API на современный стек

- Зеркалить legacy endpoints на Litestar (наш payment-service стек):
  auth (`/auth-by-phone`, `/confirm-token`, `/get-session-data`),
  `/get-auto-list`, `/get-auto-check-*`, write-операции, `/system-notice`,
  webhook `/kazna-api-update-fines`.
- Перенести cron-воркеры (avtodor/rnis/push) с устранением lock-wait
  by-design (чанки/очередь).

### 5.1. Контракт ответа `/get-auto-list` (spec для реализации)

Сведён из producer (`digitrans/.../TPLApiController.pm:739` + хелперы
`:5232-5546`) и consumer (`src/types/auto.ts`, `useAutoData.ts`,
`UserDataContext.tsx`). Наш Litestar-эндпоинт обязан воспроизвести эту форму.

**Принципы реализации (из ADR-030):** `limit`/`offset` — буквально, без
`||1000`; per-auto N+1 → set-based `GROUP BY` по странице авто; OSAGO-парсер
вынести из request-path (async/cache); top-level identity-поля собрать из
сессии.

**Верхний уровень.** `token` (эхо); `auto_list` (`AutoItem[]`, страница по
LIMIT); `auto_list_count` (строка-число, всего по фильтру — у legacy
`SQL_CALC_FOUND_ROWS`/`FOUND_ROWS()`, минус отфильтрованные в цикле); из
сессии — `user_data`, `other_user_list` (`UserData[]`), `our_services_list`
(`OurService[]`), `manager_data` (`ManagerData`, может прийти и внутри
`user_data` — фронт: `user_data.manager_data || manager_data`),
`onboarding_expired` / `onboarding_viewed` / `announce_our_services_viewed`
(0/1 или "0"/"1"); при отсутствии сессии — `auth_required:1`.

**`UserData`** (`src/types/auto.ts:13-26`): `id`, `firm`, `inn`, `phone`
(обязательные); `user_confirmed`, `phone_inn_confirmed` (0/1 — при 0 фронт
редиректит на auth); `user_auto_count` (строка; есть на элементах
`other_user_list`, на активном `user_data` обычно нет); `notification_unviewed_count`
(number); `other_user_notification_unviewed_count`; `manager_data`,
`tech_support_data` (`ManagerData`, читается только `.name`); `debt_sum`
(строка, "0.00" = нет долга).

**`ManagerData`** (`:3-11`): `id`, `mobile_phone`, `email`, `email_subject`,
`email_body`, `whatapp_greetings`, `name` — все опциональны.

**`OurService`** (`:103-108`): `id`, `name`, `header`, `description?`.

**`AutoItem`** (`src/types/auto.ts:28-101`). База: `id`, `auto_number`,
`car_type`, `sts`, `check_services`, `auto_number_base`,
`auto_number_region_code` (парсинг ГРЗ: `^(.*?)(\d{2,3})$`, иначе base=весь
номер, region=''), `debt_sum`. Флаги «пора обновить» (legacy: `IF(last_time<…)`)
— `check_passes_expared` (1ч), `check_fines_expared` (1д),
`check_diagnostic_card_expared` (30д) + `_before_finished_expared` (3д),
`check_osago_expared` (30д) + `_before_finished`, `check_avtodor_expared` /
`check_rnis_expared` (0); при `!check_services` диагкарта и ОСАГО гасятся.

Поля по вкладкам (у legacy — в самом ответе списка; семантика хелперов):
- **passes** (`_get_check_passes_data`): `check_passes_string` (дефолт
  «пропуска не обнаружены»); `..._year_period_color` (`red` <2 нед до
  `pass_end`, `yellow` <75 дн, `green`, иначе `white`); `..._year_cancelled`
  (0/1); `..._year_propusktype`, `..._year_type_of_pass_string` (1→Дневной,
  2→Ночной), `..._pass_end_str` (дд.мм.гггг), `..._pass_end_left` (DATEDIFF),
  `..._pass_end`, `..._dat_cancel_year_str`, `..._year_cancelled_viewed`,
  `..._year_ending_viewed`; второй активный пропуск — `..._another_*`.
- **fines** (`_get_check_fines_data`): `check_fines_string`, `check_fines_cnt`,
  `check_fines_sum` (`SUM` со скидкой если `discount_date_end>=CURDATE()`),
  `check_fines_color` (green/red), `check_fines_tab_show`. Строка склоняет
  «неоплаченный/ых» + дописывает ФССП/Платон counts.
  ⚠ producer = `check_fines_cnt`; сверить с TS-чтением (`check_fines_count`?).
- **diagnostic-card** (`_get_check_diagnostic_card_data`):
  `check_diagnostic_card_string` («действует, до …» / «действующие карты не
  обнаружены»), `..._period_color` (red <1 мес), `..._date_to_str`,
  `..._date_to_left`, `..._ending_viewed`, `..._tab_show`.
- **osago** (`_get_check_osago_data`): симметрично диагкарте по
  `user_auto_osago`; при отсутствии — внешний парсер (в миграции: async).
- **avtodor** (`_get_check_avtodor_data`): `check_avtodor_string`,
  `..._cnt`, `..._sum`, `..._color`, `..._tab_show`.
- **rnis** (`_get_check_rnis_data`): `check_rnis_color`, `..._reestr_string`
  («зарегистрирован в РНИС» / «не найдены»), `..._reestr_color`,
  `..._telematics_string`, `..._telematics_color`, `..._tab_show`.
- **status/заявка** (in-work SELECT `:836`): `status_header`, `stage_header`,
  `status_type_of_pass_string`, `status_propusktype`, `status_dat_year_str`,
  `status_dat_issuance_str`, `status_tab_show`.

Producer-side extras, которые фронт может не читать (можно не тащить):
`onboarding_viewed`, `*_viewed`, `check_passes_pass_end`, `stage_header`,
`*_before_finished_expared`. Сверить по фактическому чтению в
`AutoListItem.tsx` перед фиксацией DTO.

## 6. Phase 4 — Cutover

- Canary → full переключение клиентов с legacy `/api` на новый backend.
- Контроль apex `transapp.ru` A-записи (сейчас ведёт Иван; DNS-кабинет
  FastVPS у нас есть).
- Гашение legacy `base13` (или fallback на переходный период).

## 7. Матрица доступа

| Хост | Роль | Доступ сейчас | Нужно |
|------|------|---------------|-------|
| `base13` (внутр.) | perl `/api`, MySQL, cron — ядро | пароль `web01`/common (у сисадмина) | SSH + MySQL-креды/дамп. **Приоритет** |
| `185.76.253.6` | фронт-nginx, маршрутизация | нет | SSH (правки proxy/vhost) |
| docker ×2 (`docker.trade.su`, `192.168.0.33:23001`) | веб-SPA `/` | allow-list IP | SSH + docker access, compose/registry |
| `web01` | источник «common»-пароля; ещё один сервер? | пароль есть | уточнить роль |
| `transapp.ru` apex DNS | финальный cutover | DNS-кабинет FastVPS есть | контроль apex A-записи |

## 8. Открытые вопросы сисадмину

1. `base13` — публичный/внутренний IP и как дотянуться (только из
   `192.168.0.0/24` через `185.76.253.6`, или есть VPN/bastion)?
2. MySQL — на `base13` или отдельный хост? Нужен read + возможность снять
   дамп.
3. Два docker-хоста — имена/IP, где docker-compose и registry для веба.
4. `web01` — что за сервер, где в схеме.
5. Подтвердить расхождение из §1 (живой ли vhost `lk.transapp.ru` на
   сервере Ивана или мёртвый остаток до-cutover).

## Что НЕ делаем

- Не логинимся ни на один хост без явной команды пользователя.
- Не записываем пароли/креды в репозиторий или план — только в защищённый
  секрет-стор.
- Никаких изменений на проде Ивана без согласования.
