# ADR-026 — Correct ADR-025 location: production nginx `/api/` proxy lives in `entrypoint.sh`, not `nginx.prod.conf`

## Context

ADR-025 (commit `c7f2c05`, merged 2026-05-20) пытался перенацелить
nginx `/api/*` proxy с `ivan.trans-konsalt.ru` (staging-vhost) на
`transapp.ru` (prod-apex) + включить keepalive. Правка была внесена
в `nginx/nginx.prod.conf` — файл, на который указывал
`Dockerfile.prod:72` (`COPY nginx/nginx.prod.conf /etc/nginx/nginx.conf`).

Deploy 2026-05-25 прошёл успешно (image SHA в работающем контейнере
== master HEAD `c7f2c05`, контейнер пересоздан BUILD_ID buster'ом).
Однако пост-deploy верификация показала, что **фикс не работает**:

- `curl lk.transapp.ru ... /api/get-auto-list → size=130887`
- `curl transapp.ru     ... /api/get-auto-list → size=130931`
- diff JSON: 22 поля `check_diagnostic_card_date_to_left` отличаются
  типом (int через `lk`, string через `transapp.ru` direct)
- `ssh deploy@VM 'docker exec ... nginx -T | grep -A3 "location /api/"'`
  → активный конфиг по-прежнему `proxy_pass https://ivan.trans-konsalt.ru/api/`

Корневая причина: `nginx/docker/entrypoint.sh` при `YC_CERT_ID != ""`
(всегда в production) **полностью перезаписывает** `/etc/nginx/nginx.conf`
heredoc'ом `NGINX_CONF` (entrypoint.sh:43-200), где в строках 152-161
живёт **актуальный** production `location /api/` блок:

```nginx
location /api/ {
    proxy_pass https://ivan.trans-konsalt.ru/api/;
    proxy_ssl_server_name on;
    proxy_set_header Host ivan.trans-konsalt.ru;
    ...
}
```

`Dockerfile.prod:71` явно комментирует: *«Copy nginx config (HTTP
fallback, overwritten by entrypoint for HTTPS)»* — но из ADR-025 это
не было видно при ревью. ADR-017 и план `2026-05-06-lk-transapp-cutover.md`
оба корректно ссылаются на entrypoint как на источник истины — то есть
архитектура была задокументирована, но при правке упустили.

**Цель ADR-026**: вынести фикс в правильное место + устранить
архитектурный drift между двумя файлами с nginx-конфигом, чтобы
ошибка не повторилась.

## Сценарий правки

### 1. Правка production-конфига (единственный критичный шаг)

**File:** `nginx/docker/entrypoint.sh`

(a) Добавить в `http {}` блок (перед `# HTTP — redirect to HTTPS`,
строка ~76) определение upstream'а:

```nginx
upstream main_api {
    server transapp.ru:443;
    keepalive 16;
}
```

(b) Заменить блок `location /api/ { ... }` (строки 152-161) на:

```nginx
location /api/ {
    proxy_pass https://main_api/api/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_ssl_server_name on;
    proxy_ssl_name transapp.ru;
    proxy_set_header Host transapp.ru;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    proxy_connect_timeout 10s;
}
```

(c) Добавить в шапку файла (после `set -e`) видный маркер-комментарий:

```sh
# *** AUTHORITATIVE PRODUCTION NGINX CONFIG ***
# In HTTPS mode (YC_CERT_ID set — always-true in production), the
# heredoc NGINX_CONF below overwrites /etc/nginx/nginx.conf at
# container startup. The sibling file nginx/nginx.prod.conf is used
# ONLY as HTTP fallback when YC_CERT_ID is empty (never in prod).
# Keep both files in sync when editing nginx routing. See ADR-026.
```

### 2. Защита от повторного drift'а

**File:** `nginx/nginx.prod.conf`

Добавить в шапку файла (перед существующим `worker_processes`):

```nginx
# *** HTTP FALLBACK ONLY ***
# Used only when YC_CERT_ID environment variable is empty. In
# production (HTTPS mode), nginx/docker/entrypoint.sh overwrites
# /etc/nginx/nginx.conf with a heredoc-rendered config at container
# startup — that heredoc is the authoritative source for production
# nginx routing. Keep the two sources in sync. See ADR-026.
```

`upstream main_api` и `location /api/` уже после коммита ADR-025
содержат правильные значения — содержимое НЕ трогаем, остаётся
синхронным с entrypoint'ом (anti-drift policy).

### 3. Документация

**File:** `Writerside/topics/decision-log.md` — новый **ADR-026** в конце.

Структура (формат соответствует существующим ADR'ам):
- **Context** — что обнаружили, что не работало (size delta, diff
  типов в JSON, `nginx -T` показал staging-конфиг).
- **Decision** — фикс в `entrypoint.sh`, sync с `nginx.prod.conf`,
  видимые комментарии-маркеры в обоих файлах.
- **Alternatives considered** — (1) только entrypoint.sh без sync
  (отвергнуто: оставляет drift); (2) рефакторинг heredoc'а в external
  template-файл, шарящийся обоими server'ами (отложено как tech debt
  — слишком большой рефактор сейчас, риск регрессии нужно отдельно
  scope'ить).
- **Consequences** — теперь два «authoritative» файла. Comments —
  единственная защита от drift'а. Будущий рефактор tech-debt.
- **Lessons learned** — при правке dockerized-конфигов проверять
  `docker exec ... nginx -T` (или эквивалент) сразу после deploy'а, а
  не только размер JSON.

**File:** `Writerside/topics/project-dashboard.md` — Recent Changes
entry за 2026-05-25 с описанием инцидента + ссылкой на ADR-026 +
итоговыми пост-deploy метриками (после реального fix-deploy'а).

**File:** `Writerside/topics/dev-web.md` — короткая секция «nginx
config sources» (если нет существующей): где живёт production
routing, что `nginx.prod.conf` — fallback.

### 4. Task tracking

**File:** `.claude/tasks.md`

- Добавить в `## Открытые` одну строку:

```
- [ ] `[transapp]` Fix ADR-025 deployment: переместить `/api/` proxy в entrypoint.sh heredoc, sync nginx.prod.conf, ADR-026 — [[plans/2026-05-25-adr-026-entrypoint-config-correction]] 🔼 ⏳ 2026-05-25 #project/transapp #epic/web-infra
```

- В том же коммите, что и реализация — пометить `[x]` с `✅ 2026-05-25`,
  переместить в `## Выполнено`.

### 5. Session state

**File:** `.claude/session-state.md` — обновить раздел «What is NOT done»
после успешного fix-deploy'а: убрать упоминание о невыполненной
workflow_dispatch (она прошла, диагностирован баг ADR-025, фикс через
ADR-026 в работе).

## Verification (после fix-deploy'а)

1. **На VM**:
   ```bash
   ssh deploy@81.26.191.68 'docker exec $(docker ps --filter name=nginx -q) \
     nginx -T 2>/dev/null | grep -A3 -E "upstream main_api|location /api/"'
   ```
   Ожидается: `upstream main_api { server transapp.ru:443; keepalive 16; }`
   + `proxy_pass https://main_api/api/`, `proxy_ssl_name transapp.ru`,
   `Host transapp.ru`.

2. **Размер payload**'а:
   ```bash
   TOKEN=$(cat ~/transapp-monitor/token.txt)
   curl -s -o /tmp/lk.json -w 'size=%{size_download}\n' \
     -X POST https://lk.transapp.ru/api/get-auto-list \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode "token=$TOKEN" --data 'auto_list_limit=0'
   curl -s -o /tmp/direct.json -w 'size=%{size_download}\n' \
     -X POST https://transapp.ru/api/get-auto-list \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode "token=$TOKEN" --data 'auto_list_limit=0'
   ```
   Ожидается: размеры **идентичны** (±0 байт; nginx body-modify
   directives отсутствуют).

3. **Diff JSON**:
   ```bash
   diff <(python3 -m json.tool /tmp/lk.json) <(python3 -m json.tool /tmp/direct.json)
   ```
   Ожидается: **пустой diff**. Если `check_diagnostic_card_date_to_left`
   снова различается типом — значит upstream ещё на staging,
   нужно расследовать DNS resolution в upstream (см. п.5).

4. **Monitor restart**:
   ```bash
   cd ~/transapp-monitor && nohup ./probe.sh > probe.stdout.log 2>&1 &
   ps aux | grep 'probe\.sh' | grep -v grep
   echo <PID> > probe.pid
   ```
   Дать ему набрать данные за ~30 минут, потом `summary.sh --since 1h` —
   ожидается, что `lk.transapp.ru` и `transapp.ru` показывают одинаковый
   `size_dl` и сопоставимый mean TTFB (без 19s spike'ов).

5. **Если verification не сходится** — DNS upstream resolution: nginx
   резолвит `transapp.ru` один раз при старте. Если на момент старта
   apex отдал не тот A-record — keepalive прибит к нему. Проверка
   `docker exec <nginx> getent hosts transapp.ru`. Решение (не в этом
   плане, отдельный follow-up): добавить `resolver` директиву + nginx
   periodic re-resolution.

## Files to modify

| File | Change | LOC |
|------|--------|-----|
| `nginx/docker/entrypoint.sh` | Add `upstream main_api`, replace `location /api/`, add authoritative-marker header | ~25 |
| `nginx/nginx.prod.conf` | Add fallback-marker header comment | ~7 |
| `Writerside/topics/decision-log.md` | New ADR-026 entry | ~80 |
| `Writerside/topics/project-dashboard.md` | Recent Changes 2026-05-25 entry | ~10 |
| `Writerside/topics/dev-web.md` | Optional «nginx config sources» note | ~15 |
| `.claude/tasks.md` | Add+close task line | ~2 |
| `.claude/session-state.md` | Update «What is NOT done» | ~5 |

## Deploy

После merge'а коммита — пользователь dispatch'ит
`.github/workflows/deploy-web.yml` вручную. `BUILD_ID` env-buster
(ADR-016) гарантирует пересоздание контейнера. **Push в master и
workflow_dispatch — только по явной команде пользователя.**

## Out of scope (отложено как tech debt)

- Рефакторинг heredoc'а в external nginx-template, шарящийся между
  HTTP и HTTPS server'ами (устраняет drift навсегда). Отдельный план,
  отдельный risk-assessment.
- nginx upstream DNS re-resolution (`resolver` + lifetime). Только
  если verification покажет, что keepalive пул прибит к stale IP.
- `tasks.md` epic `#epic/web-infra` — если такого ещё нет, ввести
  именно этим коммитом (применяется к ADR-017/023/024/025/026).
