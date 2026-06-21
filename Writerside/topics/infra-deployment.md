# Production Deployment

> Last updated: 2026-04-26
>
> **Status:** No production deployment exists yet. payment-service runs only locally
> (`payment-service/docker-compose.yml`). The new web version is not deployed.
> CI workflow files exist in `.github/workflows/` but have never successfully reached prod.
>
> This page is the **single source of truth** for the deploy story until the first
> release goes live. It is intentionally honest about gaps.

## Current state — verified facts

Established by direct inspection on **2026-04-26** (gh CLI + DNS lookups + workflow run history).

### What exists in the repository

| Asset | Path | Purpose |
|-------|------|---------|
| Deploy workflow | `.github/workflows/deploy-web.yml` | COI-VM deploy of nginx (Expo Web) + payment-service + Postgres via `yc-actions/yc-coi-deploy@v2`. Triggers on `release: [created]` or manual. First successful run 2026-04-28; smoke verified end-to-end. |
| ~~Legacy SSH deploy workflow~~ | ~~`.github/workflows/deploy.yml`~~ | **Deleted 2026-04-29** (open question #6 closed). Was SSH-based single-container deploy via `appleboy/ssh-action`; never produced a working deploy across 4 historical runs (2026-01-15, 2026-04-14, 2026-04-23, 2026-04-29). Strategy supplanted by `deploy-web.yml` declarative COI-VM provisioning. References to it in Phase 2/3 docs may still exist as historical context. |
| Verify workflow | `.github/workflows/verify.yml` | PR-time gate: `tsc`, ESLint, Jest, Ruff. Not deploy-related. |
| Compose template | `yandex-cloud/docker-compose.yc.yaml` | Rendered by `yc-coi-deploy` inside the VM. Three services: `payment-db` (Postgres 15), `payment-service`, `nginx`. |
| Cloud-init | `yandex-cloud/user-data.yaml` | Creates non-root sudo user with SSH key on the COI VM. |
| Backend image build | `payment-service/Dockerfile.prod` | Multi-stage Python build, gunicorn entrypoint. |
| Frontend image build | `nginx/Dockerfile.prod` | Multi-stage: Node builds Expo Web → nginx:alpine serves the static bundle. |

### What does NOT exist

| Missing | Verified by |
|---------|-------------|
| GitHub Actions secrets in `TransKonsalt/TransApp` | `gh api repos/TransKonsalt/TransApp/actions/secrets` → `total_count: 0` |
| GitHub environments | `gh api repos/TransKonsalt/TransApp/environments` → `total_count: 0` |
| Org-level secrets | `gh api orgs/TransKonsalt/actions/secrets` → `total_count: 0` |
| Successful deploy runs | `gh api .../actions/runs` — only 3 historical runs of `Deploy Payment Service`, all `failure` |
| `Deploy to Yandex Cloud` runs | Never triggered (no GitHub Releases created yet) |
| DNS A-record `payment.transapp.ru` | `dig +short @8.8.8.8 payment.transapp.ru A` → empty (NXDOMAIN) |
| Terraform/IaC for cloud resources | No `*.tf` files in repo |
| Postgres backup schedule | No snapshot config, no S3 dump cron |
| Post-deploy healthcheck step | Neither workflow probes `/health` after deploy |
| Staging environment | Single-VM, single-environment configuration |

### ~~Why the legacy `deploy.yml` always fails~~ — deleted 2026-04-29

Historical record: across 4 runs (2026-01-15, 2026-04-14, 2026-04-23, 2026-04-29) every run aborted at `yc-actions/yc-cr-login@v1` with `Error: Input required and not supplied: yc-sa-json-credentials`. With the deploy.yml-specific secrets (`SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `ENV_FILE`) never populated and the strategy supplanted by `deploy-web.yml`, the workflow file was removed (open question #6 → resolved). New pushes to `master` no longer trigger the noisy auto-failure.

### What the dashboard previously claimed

`project-dashboard.md` listed `Payment Service: ✅ Deployed`. This was inaccurate
and has been corrected. The Kazna integration works locally; it has never been
exposed to the internet.

### What the mobile app's prod build expects

`src/services/api.ts:18` hardcodes `PROD_PAYMENT_API_URL = 'https://payment.transapp.ru/api'`.
The host does not resolve in public DNS. **A release-mode mobile build today has no working payment endpoint.** This is a documentation-only finding — code has not been changed.

---

## Architecture — what `deploy-web.yml` will provision when first triggered

```
   release [created]
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  GitHub Actions runner (ubuntu-latest)                       │
│                                                              │
│  build-payment      build-nginx       (parallel)             │
│       │                  │                                   │
│       └──── push to ─────┴─── cr.yandex/<registry>/...       │
│                                                              │
│              ┌───────────────────────┐                       │
│              │ yc-actions/yc-coi-    │                       │
│              │ deploy@v2             │  (idempotent)         │
│              └───────────┬───────────┘                       │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Yandex Cloud — folder ${{ secrets.YC_FOLDER_ID }}           │
│  ru-central1-d, subnet ${{ secrets.YC_SUBNET_ID }}           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ COI VM    2 vCPU (50% burstable), 4GB RAM, 20GB HDD  │    │
│  │ public IP ${{ secrets.YC_VM_PUBLIC_IP }}             │    │
│  │                                                       │    │
│  │  docker-compose.yc.yaml (rendered from template):    │    │
│  │   ┌─────────┐  ┌──────────────────┐  ┌────────────┐  │    │
│  │   │ nginx   │──│ payment-service  │──│ payment-db │  │    │
│  │   │ :80/443 │  │ :8000 (internal) │  │ pg15       │  │    │
│  │   │ + Expo  │  │ Litestar +       │  │ pg_data    │  │    │
│  │   │   Web   │  │ Tortoise + Kazna │  │ volume     │  │    │
│  │   └─────────┘  └──────────────────┘  └────────────┘  │    │
│  │                                                       │    │
│  │  SSL cert injected from Certificate Manager          │    │
│  │  (id ${{ secrets.YC_CERT_ID }}) at container start   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

VM parameters live in `deploy-web.yml` lines 98–108. They are identical to
`tradesu-moderator/.github/workflows/deploy.yml` (the project the pattern was
copied from).

---

## Resources required outside the workflow

`yc-coi-deploy` only creates/updates the VM. Everything below must be
provisioned **before** the first deploy — currently none of them exist:

| # | YC resource | GitHub secret it feeds | Notes |
|---|-------------|------------------------|-------|
| 1 | VPC + Subnet (ru-central1-d) | `YC_SUBNET_ID` | Single subnet sufficient |
| 2 | Static public IP | `YC_VM_PUBLIC_IP` | Reserved standalone, attached to VM |
| 3 | Container Registry | `YC_REGISTRY_ID` | Hosts `transapp-web:<sha>-payment` and `-nginx` images |
| 4 | Service Account "VM" | `YC_SERVICE_ACCOUNT_ID` | Roles: `container-registry.images.puller`, `compute.editor` |
| 5 | Service Account "CI" | `YC_SA_JSON_CREDENTIALS` (JSON key) | Roles: `compute.editor`, `container-registry.images.pusher` |
| 6 | Certificate Manager cert | `YC_CERT_ID` | Issued for the prod domain (see #7) |
| 7 | DNS A-record | (no secret — DNS is external) | `payment.transapp.ru` (or the chosen domain) → static IP from #2 |
| 8 | Security Group on subnet | (no secret) | Inbound 80, 443 from `0.0.0.0/0`; 22 only from admin IPs |
| 9 | Folder ID | `YC_FOLDER_ID` | Top-level YC scope all of the above belongs to |

### Required GitHub secrets — full list

Derived from `deploy-web.yml` env block (lines 9–25). Every reference is
currently empty; the first deploy is blocked until all are populated.

```
YC_SA_JSON_CREDENTIALS       — service account JSON key (CI)
YC_SERVICE_ACCOUNT_ID        — service account ID (VM, used by COI to pull images)
YC_FOLDER_ID                 — Yandex Cloud folder ID
YC_REGISTRY_ID               — Container Registry ID
YC_SUBNET_ID                 — subnet ID
YC_VM_PUBLIC_IP              — static IP attached to VM
YC_VM_NAME                   — symbolic VM name (idempotent identifier)
YC_VM_USERNAME               — SSH username (matches user-data.yaml)
YC_VM_SSH                    — SSH public key for the VM admin
YC_CERT_ID                   — Certificate Manager cert ID

PG_USER, PG_PASSWORD, PG_NAME       — Postgres bootstrap credentials
KAZNA_API_URL, KAZNA_SECRET_KEY,
KAZNA_TOKEN                         — Kazna payment provider integration
PAYMENT_IMAGE, NGINX_IMAGE          — derived in workflow, but env names are
                                      referenced inside docker-compose.yc.yaml
```

~~The legacy `deploy.yml` referenced additional secrets that are out of scope of the new pipeline.~~ **Deleted 2026-04-29** — see "Why the legacy `deploy.yml` always fails" section above for historical context.

---

## First-deploy plan — clean start, not a migration

Because nothing has ever reached production:

> This is **not** a migration; the previous payment service was never deployed.
> No blue/green, no traffic cutover, no rollback target. First release is the
> first time the world will see the service.

Steps, in order:

1. **Yandex Cloud provisioning** (one-time, manual or via Terraform):
   1. VPC + subnet in `ru-central1-d`
   2. Reserve static public IP
   3. Create Container Registry (note ID)
   4. Create two service accounts with roles listed above
   5. Decide prod domain (`payment.transapp.ru`?) and request a cert in Certificate Manager (DNS-01 challenge)
   6. Configure security group on subnet
2. **DNS** — A-record `<chosen-domain> → <static-ip-from-step-1.2>` at the
   registrar of `transapp.ru`. Wait for propagation; this also satisfies the
   ACME DNS-01 challenge for the cert.
3. **GitHub Secrets** — populate all entries from the list above. Verify with
   `gh secret list -R TransKonsalt/TransApp` (should reflect names + updated_at,
   never values).
4. ~~**Decommission `deploy.yml`**~~ — **done 2026-04-29**, file deleted.
5. **Manual smoke test of `deploy-web.yml`** — trigger via "Run workflow"
   button (the `workflow_dispatch` path), not by creating a release. This
   validates secrets/credentials before tagging anything.
6. **Post-deploy verification:**
   - `curl -I https://<domain>/health` → expect 200
   - `curl https://<domain>/api/calculate-commission ...` → expect valid JSON
   - Browser: open `https://<domain>/` and verify Expo Web loads
7. **Mobile app config** — `src/services/api.ts:18` must point at the chosen
   domain. Currently set to `https://payment.transapp.ru/api`; if the chosen
   prod domain is different, this requires a code change and a fresh OTA / EAS
   build.
8. **First GitHub Release** — tag the verified commit. `deploy-web.yml`
   re-runs; this is the canonical "v1.0.0 deployed" moment.

---

## Improvements adopted from `tradesu-moderator` analysis

`tradesu-moderator` ships the same `yc-coi-deploy` skeleton with several
refinements worth porting before first deploy. Captured here as backlog (no
code changes yet):

| Practice | Why we want it | Risk if skipped |
|----------|----------------|-----------------|
| Writerside docs built into the nginx image as a separate route | Zero-cost public docs at e.g. `/docs/`; pattern verified in tradesu | Docs stay private to repo, no public discoverability |
| Post-deploy healthcheck step (`curl -fsS /health`) | CI fails loud when container is up but app crashed | Green CI on broken prod |
| `actions/checkout@v6`, `yc-cr-login@v2` consistently | Avoids Node 20 deprecation (forced Sep 2026) | Workflow breaks on schedule |
| Comment-grouped secrets in workflow env block | Readability when secrets list grows past ~15 entries | Maintenance burden |
| Separate read-only DB user for the app, write user only for migrations | Least privilege; SQL injection blast radius shrinks | Compromised app = full DB write access |
| Images tagged with `${{ github.sha }}` (we already do this) | Atomic rollback by re-running an older deploy | n/a (already adopted) |

What `tradesu-moderator` does **worse** and we should not copy:
- Hardcoded `YC_CERT_ID` and `vm-public-ip` literals in workflow YAML
  (impossible to fork or stage). Our `deploy-web.yml` already uses secrets for
  both — keep it.

---

## DNS strategy and cohabitation plan

### Domain landscape (verified 2026-05-14, post-cutover)

| Domain / record | Resolves to | Authoritative NS | Owner / control |
|-----------------|-------------|-------------------|-----------------|
| `transapp.ru` (A) | `185.76.253.6` (legacy nginx, marketing site, 302 → `/transport`; `/api` → внутр. `base13`, `/` → docker — см. § "Old prod servers") | `dns{,2,3,4}.fastdns24.{com,org,eu,link}` | colleague Иван (legacy server admin) — also runs the `transapp.ru/api` backend used by mobile prod |
| `www.transapp.ru` (A) | `185.76.253.6` | same | same colleague |
| `lk.transapp.ru` (A) | **`81.26.191.68`** (our YC VM, new Expo Web) | same | **A-record cutover done 2026-05-14**; record managed by us via FastVPS panel |
| `_acme-challenge.lk.transapp.ru` (CNAME) | `fpqhlo3n4968ul5jnosr.cm.yandexcloud.net.` | same | us — Let's Encrypt validation for current SAN cert (renewed automatically by YC) |
| `transapp.ru` MX | `mx3.trade.su` | same | colleague |
| `transapp.ru` SPF | includes `185.76.253.0/24`, UniSender, plus 2 explicit IPs | same | colleague |
| `transapp-dev.ru` (A) | `81.26.191.68` (our YC VM, alias, same nginx as `lk.transapp.ru`) | `ns1/ns2.yandexcloud.net` | **us** — registered on reg.ru 2026-04-26 |
| `payment.transapp.ru` | NXDOMAIN | n/a | placeholder в `src/services/api.ts:18`, никогда не использовался — нет в DNS, удалить из кода при следующем рефакторинге `api.ts` |

**DNS provider clarification**: control panel — **FastVPS** (`my.fastvps.ru`,
zone `transapp.ru` accessible at `/v2/dns/85660/domain/272978/edit`). NS
servers (`dns.fastdns24.com`, etc.) — DNS backend под капотом FastVPS
(whitelabel/reseller relationship). До 2026-05-14 управление зоной шло
только через Ивана; сейчас FastVPS-кабинет доступен и нам напрямую — мы
владеем записями `lk.transapp.ru` и `_acme-challenge.lk.transapp.ru` без
тикетов в хелп-деск.

**Registrar of `transapp.ru`** — reg.ru (наш аккаунт). Но фактическое
управление DNS-записями зоны идёт через FastVPS, что выше.

### DNS strategy — actual history

Initial plan (2026-04-26): `transapp-dev.ru` staging → `app.transapp.ru`
cohabitation → `lk.transapp.ru` cutover. Phase 2 (`app.transapp.ru`) был
**пропущен** — после переговоров с Иваном решили идти сразу на `lk.*`
cutover, минуя промежуточный поддомен (без тестировщиков role-of-QA
выполняют сами менеджеры с клиентами в реальной работе, дополнительная
прослойка не оправдана).

**Phase 1 — independent staging on `transapp-dev.ru`** (✅ done 2026-04-28)

- Зона создана в Yandex Cloud DNS, NS делегированы.
- Стек развёрнут на YC VM `transapp-web` (`fv42gattub1fh05eaip5`, IP
  `81.26.191.68`), full stack (COI + nginx + payment-service + payment-db +
  vpn + payment-bot), SSL через YC Certificate Manager.
- Использовался как production-mode staging для итераций Payment Service,
  cert PR'ов, Kazna integration.

**Phase 2 — `app.transapp.ru` cohabitation** (❌ skipped, see ADR-017)

Заложенный промежуточный поддомен не имел ценности без отдельной
QA-команды. Пропущен в пользу прямого cutover'а на `lk.transapp.ru`.

**Phase 3 — `lk.transapp.ru` direct cutover** (✅ done 2026-05-14, ADR-017)

Выполнено как direct DNS swap, не soft cohabitation, как ранее
проектировалось в `.claude/plans/2026-05-06-lk-transapp-cutover.md`.
Trigger смены подхода: коллега Иван согласился сразу отдать управление, а
DNS-control panel FastVPS оказался доступен нам напрямую — отпала
необходимость в координационных тикетах и cookie-bypass'е.

Шаги:

1. **SAN-cert в YC Certificate Manager** — новый cert `fpqhlo3n4968ul5jnosr`
   (имя `transapp-web-san-2026-05`, Let's Encrypt R12, действует до
   2026-08-12, SAN: `transapp-dev.ru` + `lk.transapp.ru`). Перед заказом
   удалили старый CNAME `_acme-challenge.transapp-dev.ru` от cert'а
   `fpqj50bofmtu8012f0k0` (иначе YC не мог добавить новый — DNS не
   позволяет два CNAME на один лейбл). Validation CNAME для `lk` добавлен
   вручную через FastVPS UI. **Наблюдение**: validation cert'а с external
   CNAME занял ~40 минут — больше, чем YC docs обещают «несколько минут».
   Это baseline для будущих cert-операций.
2. **GitHub secret `YC_CERT_ID`** обновлён на новый ID. `deploy-web.yml`
   запущен через `workflow_dispatch`. `nginx/docker/entrypoint.sh` при
   старте контейнера фетчит cert из YC по `YC_CERT_ID` — изменений в коде
   не потребовалось (`server_name _;` — catch-all).
3. **Pre-swap smoke** через `curl --resolve lk.transapp.ru:443:81.26.191.68`:
   HTTPS 200, `subjectAltName: DNS:lk.transapp.ru, DNS:transapp-dev.ru`,
   payment-api `/calculate-commission` отвечает 201 с корректным JSON.
4. **Swap A-record** `lk.transapp.ru: 185.76.253.6 → 81.26.191.68` через
   FastVPS UI. Все 4 публичных resolver'а (dns.fastdns24.com / 8.8.8.8 /
   1.1.1.1 / 77.88.8.8) подхватили новый IP за <5 минут. Post-swap
   `curl -I https://lk.transapp.ru/` → 200; payment-api 201.

**Rollback окно**: TTL у FastVPS — 3600s (не понижали — направление
миграции одностороннее). Soft-rollback через смену A-record обратно
работает в течение часа после swap'а — нужно только если что-то
критичное обнаружится в первый час, дальше fix-forward.

**Legacy VM** `185.76.253.6` остаётся обслуживать `transapp.ru` (apex) +
`www.transapp.ru` + `transapp.ru/api` backend (используется мобильным
приложением и нашим nginx как upstream). Иван гасит VM на своё
усмотрение в будущем — наша сторона не зависит.

### What we will NOT do

- **Do not move NS for `transapp.ru` to Yandex Cloud DNS.** Зона содержит
  legacy-записи (MX, SPF, apex A, www) — переезд требует их recreate'а с
  риском email/legacy outage. Не надо. После cutover'а `lk.*` единственные
  записи, которые нам интересны (lk A + `_acme-challenge.lk` CNAME), уже
  под нашим контролем через FastVPS-кабинет.
- **Do not put payment endpoint on a different subdomain.** `deploy-web.yml`
  serves both web и payment-api под одним nginx + одним SAN cert. Same-origin
  payment API избавляет от CORS-настройки в nginx. Path-based split
  достаточно: `/` → Expo Web, `/payment-api/` → payment-service, `/api/`
  → proxy на legacy `ivan.trans-konsalt.ru` backend.

---

## Shared folder considerations (`b1g2p4bd4r3v0ggge11d`)

This folder already hosts `tradesu-moderator`. Co-tenancy is intentional, but
each TransApp resource must be scoped so it can't collide with tradesu.

### What can be reused as-is

| Resource | Reuse strategy | Why safe |
|----------|----------------|----------|
| Folder + billing account | Single owner | No isolation needed |
| CI service account JSON key (`YC_SA_JSON_CREDENTIALS`) | Reuse the same JSON in TransApp's `gh secret` | A folder-scoped CI SA can push to multiple registries / create multiple VMs in the same folder |
| Yandex Certificate Manager | Two independent certs in the same folder | Each cert is standalone; tradesu's cert (`fpqajd1s7epjq1nikf44`) is hardcoded in their workflow, ours will be its own ID |

### What must be created fresh (TransApp-specific)

| Resource | Naming convention | Notes |
|----------|------------------|-------|
| VM | `transapp-web` (or `transapp-prod`) | `vm-name` is the idempotency key for `yc-coi-deploy` — must NOT match tradesu's `YC_VM_NAME` |
| Container Registry **or** repo prefix | New CR `transapp` OR reuse the tradesu CR with separate repo names | Image tag in `deploy-web.yml`: `cr.yandex/<registry>/<image>:<sha>-payment` / `-nginx`. Decide registry strategy before populating `YC_REGISTRY_ID` |
| Static public IP | New reservation | tradesu's IP is theirs; ours is `YC_VM_PUBLIC_IP` |
| VM service account | New SA with `container-registry.images.puller` (and the registry it reads from) | Or reuse tradesu's if it has access to the same CR |
| Cloud DNS zone | New public zone `transapp-dev.ru` (Phase 1) | Tradesu has its own zone in this same folder — they coexist as separate zones |
| Postgres credentials (`PG_USER` / `PG_PASSWORD` / `PG_NAME`) | Independent values | Even if both projects had compromise of one, the other is unaffected |
| `KAZNA_*` secrets | TransApp-specific | tradesu doesn't use Kazna |

### Container Registry — lifecycle policy (cost & hygiene)

YC Container Registry charges **only for storage volume** (~1 ₽/GB/month at 2026
pricing). Trafic from CR to a VM in the same availability zone is free. The
number of registries does not affect cost — N small registries cost the same
as one large one of equal total volume.

The **real risk is unbounded image growth**: every CI run pushes 2 new images
(`<sha>-nginx`, `<sha>-payment`). Without a policy old SHAs stay forever.
Tradesu's shared CR demonstrates this — 85 images / 2.18 GB accumulated
without lifecycle rules.

Lifecycle policies in YC CR are **per-repository, not per-registry** (API
field `repositoryId` is required). A repository is created automatically on
first successful `docker push` — until then there is no entity to attach a
policy to, and the management console doesn't render the relevant tab on an
empty registry. Two ways to set the policy:

1. **UI under an admin account (recommended):** in the YC Console, navigate
   Container Registry → registry `transapp` → repository row `transapp-web`
   → "Политики жизненного цикла" → Создать. **Use a personal YC account**
   (the human admin of the folder), not the deployer service account — the
   CI service account intentionally lacks lifecycle-policy management
   permissions (see "Why not via CI service account" below).
2. **Pre-deploy via CLI:** `yc container repository lifecycle-policy create`
   accepts `--repository-name`; if the repo doesn't exist, the command creates
   it empty and attaches the policy. Requires `yc` CLI installed and logged in
   as the human admin (or any principal with `container-registry.editor` on
   the registry).

### Why not via CI service account

Attempting `yc container repository lifecycle-policy create` while
authenticated as the deployer SA (`ajev4eihrb827f5hf7oq`) returns
`PermissionDenied`. **This is correct security model**, not a misconfiguration.
The SA's role set (`container-registry.images.{pusher,puller}`,
`compute.editor`, `certificate-manager.certificates.downloader`, `vpc.user`,
`vpc.publicAdmin`, `iam.serviceAccounts.user`) intentionally excludes:

- `container-registry.editor` (would allow deleting the policy or images)
- `resource-manager.admin` (would allow self-promoting via
  `add-access-binding`)

If lifecycle policy ever needs to be re-created or modified by automation
(rare — it's typically a one-time setup), the proper path is: **temporarily**
grant `container-registry.editor` on the registry to the SA, run the
operation, **immediately revoke**. Don't leave the elevated role attached.

For the initial setup of `transapp-web` policy on 2026-04-28 we used the
human-admin UI path — five minutes of clicking, zero permission expansion
on the SA, no re-revoke needed.

### Recommended policy for `transapp-web` (ready-to-paste)

Same shape as the tradesu policy validated on 2026-04-28 (see "Reference:
tradesu-moderator policy" below). Goes into the `transapp-web` repository
once it materialises (= after the first successful `deploy-web.yml` run).

**Console form fields** — fill the policy header, then add 4 rules in order.

**Policy header**

| Field | Value |
|---|---|
| Имя | `cleanup-default` |
| Описание | `Базовая чистка transapp-web: untagged через 24h; по 10 свежих SHA-сборок каждого сервиса (nginx/payment) на 30 дней; стабильные теги (latest/prod/release-*) защищены от удаления на ~100 лет.` |

**Rule 1 — untagged**

| Field | Value |
|---|---|
| Тег | (пусто) |
| Образов без тегов | ВКЛ |
| Время от создания, в сутках | `1` |
| Образов оставить | `0` |
| Описание правила | `Удалять untagged-образы (failed pushes / orphans после перетегирования) через 24h.` |

**Rule 2 — nginx SHA cleanup**

| Field | Value |
|---|---|
| Тег | `^[a-f0-9]{40}-nginx$` |
| Образов без тегов | ВЫКЛ |
| Время от создания, в сутках | `30` |
| Образов оставить | `10` |
| Описание правила | `SHA-сборки nginx (Expo Web): 10 свежих, удалять старше 30 дней.` |

**Rule 3 — payment SHA cleanup**

| Field | Value |
|---|---|
| Тег | `^[a-f0-9]{40}-payment$` |
| Образов без тегов | ВЫКЛ |
| Время от создания, в сутках | `30` |
| Образов оставить | `10` |
| Описание правила | `SHA-сборки payment-service: 10 свежих, удалять старше 30 дней. Отдельное правило, чтобы retained_top считался независимо от nginx — иначе при активной разработке одного сервиса другой мог бы выпадать из «топ-10» суммарной выборки и удаляться раньше времени.` |

**Rule 4 — защита стабильных тегов (на будущее)**

| Field | Value |
|---|---|
| Тег | `^(latest\|stable\|prod\|production\|main\|master\|release-.*\|v\d.*)$` |
| Образов без тегов | ВЫКЛ |
| Время от создания, в сутках | `36500` |
| Образов оставить | `0` |
| Описание правила | `Защитное правило: если когда-нибудь начнём тегать стабильные релизы, они НЕ будут матчиться SHA-правилами и НЕ удалятся. Сейчас правило бездействует — стабильных тегов нет.` |

**Equivalent JSON for the CLI path** (`yc container repository
lifecycle-policy create --rules <file> --active`):

```json
[
  { "description": "delete untagged after 24h",
    "expire_period": "24h",
    "untagged": true,
    "retained_top": 0 },
  { "description": "keep last 10 nginx SHA builds for 30 days",
    "expire_period": "720h",
    "tag_regexp": "^[a-f0-9]{40}-nginx$",
    "retained_top": 10 },
  { "description": "keep last 10 payment SHA builds for 30 days",
    "expire_period": "720h",
    "tag_regexp": "^[a-f0-9]{40}-payment$",
    "retained_top": 10 },
  { "description": "protect stable tags forever (latest/prod/release-*)",
    "expire_period": "876000h",
    "tag_regexp": "^(latest|stable|prod|production|main|master|release-.*|v\\d.*)$",
    "retained_top": 0 }
]
```

`expire_period` must be a multiple of 24h. `retained_top` is a hard floor —
the N most recent images are kept regardless of age, enabling rollback.

### Why these specific values

| Decision | Rationale |
|---|---|
| `^[a-f0-9]{40}-{service}$` instead of `.+` | Exact match for `${{ github.sha }}-<service>` from `deploy-web.yml:30-31`. Future stable tags (`latest`, `prod`) won't match, so they survive cleanup automatically — no fragile coordination between rules. |
| Two SHA rules (nginx + payment) instead of one with combined regex | Per-rule `retained_top` is independent. With one combined rule and 10 retained, an active-development backend could push out 10 nginx builds in a day and erase older payment builds prematurely. Per-service retention preserves rollback for each service independently. |
| Protective rule with 36500d (`876000h`) | YC requires `expire_period` set; this is effectively "never". Pre-emptive — if anyone ever tags `latest` on a hotfix, it survives. |
| `retained_top: 10` per service | 10 deploys back is plenty for emergency rollback; older versions are usually unrunnable anyway (DB schema migrations, dependency drift). |

### Reference: tradesu-moderator policy (validated 2026-04-28)

Same approach, different repository. Created with id `crpsnk9c2anhcvbndrv1`,
status `Active`. Repository structure differs slightly: tradesu has 3
services in one repo (`backend`, `nginx`, `ssh-tunnel`) vs our 2
(`nginx`, `payment`), so they have 5 rules (untagged + 3 service-specific +
protective) and we have 4.

**Validated end-to-end:**
- Pre-activation dry-run: **46 of 85 images** matched cleanup criteria
- Post-activation sweep result: **85 → 39 images** (deleted 46 — exact match
  with the dry-run prediction)
- Cleanup ratio: **~54% of stored images removed** in one sweep on a
  registry that had accumulated 12+ months of unmanaged churn

This is the empirical anchor that the rule shape is sound. The remaining
39 images = 10 most recent SHAs per service (`backend` + `nginx` +
`ssh-tunnel`, ≈30 images) + anything younger than 30 days that didn't fit
the top-10 (≈9 images). When we apply the same shape to `transapp-web`
after first deploy, expect proportional behaviour: at first the policy
will keep everything (because we'll have <10 SHAs per service); after
~30 days of regular pushes it'll start retiring oldest sha/service pairs.

**Repository = exact-string match, not a prefix namespace.** Per YC console
warning text on the policy creation page:

> Политика применяется к Docker-образам, имена которых в точности
> совпадают с именем репозитория. Совпадение по префиксу не поддерживается.

If a registry contains `foo`, `foo/bar`, and `foo-baz`, those are three
**independent** repositories from the lifecycle-policy perspective — a policy
on `foo` does not apply to the others, each needs its own policy.

For our `transapp-web` repo this is convenient: both images
(`transapp-web:<sha>-nginx` and `transapp-web:<sha>-payment`) live under the
**same** repository name `transapp-web` (only the tag differs), so a single
policy chart-wipes the storage for both nginx and payment service builds.

For multi-repo registries (e.g. tradesu's CR with separate `tradesu-moderator`,
`ssh-tunnel`, `nginx` repos under one registry) each repository needs its own
policy — there's no "policy at registry level" or "by prefix" option.

If a repository uses **stable tags that should be kept forever** (`latest`,
`prod`, `stable`, `release-*`), the recommended `tag_regexp: ".+"` rule will
also match them. In that case split into two rules: one regex for stable tags
with effectively-infinite `expire_period`, another regex for SHA-style tags
with the 30-day rule. Our `transapp-web` only emits SHA tags from
`deploy-web.yml`, so the simple two-rule policy above is sufficient.

### Subnet — share or split?

Tradesu's `deploy.yml` reads `YC_SUBNET_ID` from secrets — we don't know its
value without checking the folder. Two options:

- **Reuse the same subnet.** Cheaper, simpler. A `/24` subnet can host
  hundreds of VMs; collision is theoretical only. Two production VMs sharing a
  subnet is normal practice.
- **Create a dedicated subnet for TransApp.** Slightly cleaner separation,
  enables per-subnet security group / route table evolution. Rarely worth the
  ceremony at this stage.

Recommendation: reuse tradesu's subnet unless there's a specific
network-isolation requirement. We can split later by changing
`YC_SUBNET_ID` in TransApp secrets and re-running `deploy-web.yml` (the
COI action will move the VM).

### Provisioning order — what depends on what

A common confusion: "we need an IP before we create the DNS zone, and we need
a VM before we have an IP". This is **not** the actual dependency graph.

The right order is:

```
1. DNS zone for transapp-dev.ru        (no dependency)
2. Static public IP                    (no dependency)
3. A-record transapp-dev.ru → <IP>     (depends on 1 + 2)
4. SSL cert via Certificate Manager    (depends on 3 — DNS-01 challenge)
5. GitHub secrets populated            (depends on 2 + 4 + IDs from console)
6. workflow_dispatch on deploy-web.yml (depends on 5)
7. VM is created by yc-coi-deploy      (happens during step 6)
```

Key facts:

- **A DNS zone is just a container for records** — it can be created empty,
  with only its SOA + NS records, and YC's nameservers immediately start
  answering for the domain. No IP needed.
- **Static IP is a standalone resource** — reserved in the VPC subnet,
  detached from any VM. The VM gets the IP attached when `yc-coi-deploy`
  creates it during the workflow run; the IP itself exists independently
  before that.
- **The certificate cannot be issued without the zone** — Certificate
  Manager's DNS-01 challenge writes a `_acme-challenge.transapp-dev.ru` TXT
  record into our zone and reads it back. If the zone doesn't exist, there's
  nowhere to write. The A-record on the apex isn't strictly required for the
  challenge (DNS-01 checks TXT, not A), but in practice it's added at the
  same time because the cert is useless without something to attach it to.
- **`_acme-challenge` lives forever as a CNAME, not a TXT.** Yandex
  Certificate Manager doesn't write a one-shot TXT and remove it — it creates
  a permanent CNAME `_acme-challenge.<domain> → <cert-id>.cm.yandexcloud.net`
  in our zone, and at every renewal points the challenge resolution at its
  own internal record. This is auto-renewal infrastructure: do not delete the
  CNAME, do not delete the cert in CM (deletion would orphan it), do not
  delete the zone. For `transapp-dev.ru`: `_acme-challenge.transapp-dev.ru
  CNAME fpqj50bofmtu8012f0k0.cm.yandexcloud.net.`
- **The VM is the LAST thing created**, not the first. `yc-coi-deploy`
  expects the IP, the cert ID, and the registry to exist before it provisions
  the VM (these are passed via `with:` and `env:` from secrets).

So the staging-domain DNS-zone task is **unblocked right now** — no need to
wait for a VM, an IP, or anything else.

### Pre-flight check before populating secrets

A short audit pass (manual, in YC console) before configuring GitHub secrets:

1. Open folder `b1g2p4bd4r3v0ggge11d`.
2. List VMs — confirm tradesu's VM name and write down our chosen
   `transapp-web` (must differ).
3. List service accounts — note tradesu's CI SA and its roles. Decide:
   reuse for TransApp CI, or create a TransApp-only CI SA. (Reuse is fine
   for a single-developer scenario.)
4. List subnets — pick the one to reuse or create a new one.
5. List Container Registries — decide single CR with `transapp-*` repos vs
   dedicated CR.
6. List Cloud DNS zones — confirm `transapp-dev.ru` is not already there
   (it shouldn't be, we just bought the domain).
7. Check Certificate Manager — note tradesu's cert IDs to avoid confusion
   when ours arrives.

This audit takes ~5 minutes and prevents 90 % of "wrong ID in secret"
failures on the first deploy.

---

## Open questions blocking first deploy

These are explicit, prioritised questions that need a decision before code or
infra moves. Status updated 2026-04-26.

1. ~~**Domain registrar of `transapp.ru`?**~~ ✅ reg.ru (we own the registrar
   account). DNS-records managed through **FastVPS panel**
   (`my.fastvps.ru`, DNS backend = fastdns24 NS). До 2026-05-14 единый POC
   был Иван; с 2026-05-14 FastVPS-кабинет также доступен нашей стороне
   (получили креды для cutover'а `lk.transapp.ru`). См. «DNS strategy» выше.
2. ~~**Yandex Cloud account and folder.**~~ ✅ Decided 2026-04-26: deploy
   into **the existing folder `b1g2p4bd4r3v0ggge11d`**, the same one that
   hosts `tradesu-moderator`. Rationale: shared billing, shared admin scope,
   shared CI service account credentials, faster onboarding. The COI VM is
   provisioned declaratively by `yc-actions/yc-coi-deploy@v2` — it reads VM
   parameters from the `with:` block of `deploy-web.yml` and creates the VM
   on first successful run if it doesn't exist (`vm-name` is the idempotency
   key). See "Shared folder considerations" below for what to reuse vs.
   what to create fresh.
3. **Single VM (web + payment + db) vs split?** Default in `deploy-web.yml`
   is single-VM. For low traffic, fine. If traffic profile is unknown but
   could be heavy, splitting now is cheaper than splitting later.
4. **Old prod servers (`185.76.253.4`, `185.76.253.6` — `transapp.ru`,
   `ivan.trans-konsalt.ru`).** They host the legacy main API used by both
   mobile (`api.ts`) and web (`api.web.ts`). Out of scope for this deploy
   unless we want to consolidate them into the new VM (we don't, for now).
   Confirmed (2026-04-26): owner is the same colleague who maintains the
   legacy mobile app, web, and DNS. Single point of contact for all
   coordination.

   **Internal topology behind `185.76.253.6`** (раскрыто сисадмином
   2026-06-18, см. `.claude/plans/2026-06-18-legacy-backend-takeover.md`).
   Публичный фронт-nginx на `185.76.253.6` маршрутизирует `transapp.ru` по
   location, а не отдаёт всё одним backend'ом:
   - `location /api` → `proxy_pass http://base13` — **`base13`** это
     внутренний хост с perl `/api/*`, MySQL и cron-воркерами
     (`check_avtodor` ~10:00, `check_rnis` ~15:00). Именно сюда в итоге
     попадает `/api/get-auto-list` (mobile напрямую; web — через наш YC
     nginx как upstream на `transapp.ru:443`). `base13` = реальное ядро
     backend и источник latency-инцидентов на `/get-auto-list`.
   - `location /` → `proxy_pass http://192.168.0.33:23001` — веб-SPA на
     docker (`docker.trade.su`, «всего два» docker-хоста), за allow-list
     IP (`91.200.29.122`, `109.94.2.150`).
   - Внутренняя сеть `192.168.0.0/24`; экосистема `trade.su`. Вход на
     `base13` — пароль «common» (тот же что у `web01`, держит сисадмин).
   - Мы пока доступа к `base13` / docker / фронт-nginx не имеем — только
     HTTP через `/api/*`. План захвата и миграции под наш контроль —
     `.claude/plans/2026-06-18-legacy-backend-takeover.md`.
5. **Terraform now or later?** Recommendation: provision once manually for
   speed, codify in Terraform afterwards using `yc-cli terraform import`. This
   defers IaC complexity until the resources actually exist.
6. ~~**`deploy.yml` — delete or archive?**~~ ✅ **Closed 2026-04-29: deleted.** Across 4 historical runs (2026-01-15 → 2026-04-29) every run aborted at `yc-actions/yc-cr-login@v1` for missing `yc-sa-json-credentials`; SSH-deploy strategy was supplanted by declarative `yc-coi-deploy@v2` in `deploy-web.yml`; ничего ценного не теряется. Pushes to master с изменениями в `payment-service/**` больше не порождают автоматический red-badge.
7. **Who is the on-call for prod incidents?** Single-person team currently;
   monitoring / alerting story is empty. At minimum, configure Yandex Cloud
   Monitoring or a uptime-robot HTTP probe before going public.
8. ~~**Kazna sandbox vs production endpoint while staging on `transapp-dev.ru`.**~~
   ✅ Closed 2026-04-28: local `payment-service/docker-compose.yml:10` already
   uses **demo/sandbox Kazna** (`https://demopay.oplatagosuslug.ru/api/kazna/2.2`).
   Same merchant credentials populated into staging GitHub secrets, so the
   smoke deploy will exercise the real Kazna integration end-to-end with
   zero real-money risk and no separate sandbox-merchant negotiation needed.
   Production cutover (Phase 2) will require swapping `KAZNA_API_URL`,
   `KAZNA_SECRET_KEY`, `KAZNA_TOKEN` to real-Kazna credentials.

---

## Live checklist — what's ready, what's pending

| Item | Status | Notes |
|------|--------|-------|
| `transapp-dev.ru` registered on reg.ru | ✅ done (2026-04-26) | NS = `ns1/ns2.yandexcloud.net` |
| YC folder chosen | ✅ done (2026-04-26) | `b1g2p4bd4r3v0ggge11d` (shared with `tradesu-moderator`) |
| Pre-flight audit of folder contents | ✅ done (2026-04-28) | Folder `b1g2p4bd4r3v0ggge11d` contains 2 VMs: `tradesu-moderator` (id `fv48bk7tcnmpf6bomb07`, IP `158.160.226.137`, internal `10.127.0.27`, Intel Ice Lake = `standard-v3`, subnet `fl8702klmck8qe2lgmfn`) and `ota-updates` (id `fv4uuj6mmbvrjp769pro`, `standard-v4a`, `10.130.0.10`/`158.160.195.46` — different subnet `10.130.x`, unrelated project, no collision risk). Confirmations: (1) our subnet `fl8702klmck8qe2lgmfn` is the same `10.127.x` that tradesu uses → shared by design; (2) our static IP `81.26.191.68` doesn't overlap with either existing VM; (3) `standard-v3` platform from `deploy-web.yml:104` matches tradesu's Intel Ice Lake; (4) tradesu's external IP `158.160.226.137` matches the hardcoded `vm-public-ip` in their workflow line 171. Decision: `YC_VM_NAME = transapp-web` — distinct from both existing VM names, matches our CR repo name. |
| VM name decided | ✅ done (2026-04-28) | `transapp-web` — chosen in pre-flight audit. Goes into `YC_VM_NAME` secret. Distinct from `tradesu-moderator` and `ota-updates` already in the folder (verified). Same name as the CR repository (`cr.yandex/crp5r94toq386vkahvml/transapp-web`). |
| VM SSH user + public key decided | ✅ done (2026-04-28) | `YC_VM_USERNAME = deploy` (matches tradesu's convention; same value works because `yandex-cloud/user-data.yaml` parametrises username via `{{ env.YC_VM_USERNAME }}`, no hardcode). `YC_VM_SSH` = contents of local `~/.ssh/id_ed25519.pub` (Ed25519 public key, starts with `ssh-ed25519 AAAA…`). cloud-init creates the user with `groups: sudo`, `sudo NOPASSWD:ALL`, `shell: /bin/bash`. Once VM is up, login is `ssh deploy@81.26.191.68`. **Critical:** the secret must contain the **public** key only — confusing it with the private key (`-----BEGIN OPENSSH PRIVATE KEY-----`) would leak the key into YC metadata. Verify with `head -c 12 ~/.ssh/id_ed25519.pub` → expect `ssh-ed25519`. |
| `transapp-dev.ru` zone created in YC Cloud DNS | ✅ done (2026-04-26) | Verified: `dig transapp-dev.ru NS @8.8.8.8` → `ns1/ns2.yandexcloud.net`; `dig SOA @ns1.yandexcloud.net` → serial=1, MNAME `ns1.yandexcloud.net.`, RNAME `mx.cloud.yandex.net.` — zone is live in public DNS, ready to accept records |
| Service account `transapp-deployer` created | ✅ done (2026-04-28) | id `ajev4eihrb827f5hf7oq`. **Single-SA approach** — same SA serves both CI (push images, create VM) and VM runtime (pull images, download cert). Acceptable for staging single-developer setup; should be split into `transapp-ci` + `transapp-vm` for production hardening. Roles attached (final, after security cleanup): `container-registry.images.pusher` (CI), `container-registry.images.puller` (VM), `compute.editor` (CI), `certificate-manager.certificates.downloader` (VM), `vpc.user` (CI). Earlier draft had `editor` and `compute.admin` — both removed; current set is the documented minimum. Goes into `YC_SERVICE_ACCOUNT_ID` (VM runtime) and serves as the source for `YC_SA_JSON_CREDENTIALS` (CI auth — see next row). |
| Authorized JSON key for `transapp-deployer` | ❌ pending | Goes into `YC_SA_JSON_CREDENTIALS` GitHub secret. Created via console: Service Accounts → `transapp-deployer` → Создать ключ → Авторизованный ключ → JSON → download. Downloadable **only once** at creation. **Local storage convention:** `.secrets/yc-transapp-deployer.json` in repo root — `.secrets/` is git-ignored (added in `.gitignore` line 53; verified by `git check-ignore`), so the file cannot accidentally reach the remote. Upload to GitHub via `gh secret set YC_SA_JSON_CREDENTIALS -R TransKonsalt/TransApp < .secrets/yc-transapp-deployer.json` — file content (whole JSON, curly braces and `\n` literals included) becomes the secret value. After successful first deploy, deleting the local copy further shrinks attack surface. |
| Static public IP reserved in YC | ✅ done (2026-04-26) | `81.26.191.68` (resource id `fl884aq6ria0hhp849m2`). Standalone, unattached — `ping` does not respond (expected; YC does not route to detached static IPs until a VM picks them up). Goes into `YC_VM_PUBLIC_IP` secret + A-record `transapp-dev.ru → 81.26.191.68` |
| Subnet identified | ✅ done (2026-04-26) | `fl8702klmck8qe2lgmfn` — name `network-ru-central1-d`, status Active, folder `b1g2p4bd4r3v0ggge11d`. Default subnet in zone `ru-central1-d` (matches `vm-zone-id` hardcoded in `deploy-web.yml:103`). Shared with tradesu (co-tenancy by design). Goes into `YC_SUBNET_ID` secret |
| Container Registry created | ✅ done (2026-04-26) | Dedicated registry `transapp` (id `crp5r94toq386vkahvml`) in folder `b1g2p4bd4r3v0ggge11d`. Separate from tradesu CR for clean isolation. Goes into `YC_REGISTRY_ID` secret. Image paths: `cr.yandex/crp5r94toq386vkahvml/transapp-web:<sha>-{nginx,payment}` |
| Certificate Manager cert for `transapp-dev.ru` | ✅ done (2026-04-26) | id `fpqj50bofmtu8012f0k0` (Let's Encrypt via DNS-01). Goes into `YC_CERT_ID` secret. Auto-renewal CNAME `_acme-challenge.transapp-dev.ru → fpqj50bofmtu8012f0k0.cm.yandexcloud.net.` is permanent — must not be deleted. Verified `dig +short transapp-dev.ru A @8.8.8.8 → 81.26.191.68`, A-record propagated |
| GitHub secrets populated | ✅ done (2026-04-28) | All 16 entries set: 10 YC-side (`YC_FOLDER_ID`, `YC_VM_PUBLIC_IP`, `YC_CERT_ID`, `YC_SUBNET_ID`, `YC_REGISTRY_ID`, `YC_SERVICE_ACCOUNT_ID`, `YC_VM_NAME`, `YC_VM_USERNAME`, `YC_VM_SSH`, `YC_SA_JSON_CREDENTIALS`) + 3 Postgres (`PG_USER=transapp_payment`, `PG_NAME=transapp_payment`, `PG_PASSWORD` = 43-char base64-from-`openssl rand -base64 32 \| tr -d '\n/'`, **stored in 1Password** before `unset PG_PWD` — recovery without it requires Postgres-volume reset) + 3 Kazna sandbox (`KAZNA_API_URL=https://demopay.oplatagosuslug.ru/api/kazna/2.2`, `KAZNA_SECRET_KEY=SA9QXHKV`, `KAZNA_TOKEN=testservice`). Verified: `gh secret list -R TransKonsalt/TransApp` returns 16 names. Ready for smoke deploy via `gh workflow run deploy-web.yml`. |
| `deploy-web.yml` smoke test (workflow_dispatch) | ✅ done (2026-04-28) | Run #25062188504 finished green after 5 iterations: (1) `npm ci` ERESOLVE on `@types/react-dom` (fixed in PR #1 commit 1) → (2) `npm ci` ERESOLVE on `react-test-renderer` patch-version mismatch + Firebase async-storage peer-dep (fixed in PR #1 commit 1 with overrides) → (3) Expo export missed `tailwind.config.js` + `global.css` (fixed in PR #1 commit 2) → (4) `yc-coi-deploy` PERMISSION_DENIED on VPC network (added `vpc.publicAdmin` to SA) → (5) PERMISSION_DENIED on service account (added `iam.serviceAccounts.user` to SA) → success. VM id `fv42gattub1fh05eaip5` created, IP `81.26.191.68` attached, both containers running. Verified: `curl -I https://transapp-dev.ru/` returns HTTP 200 + nginx 1.29.8; `curl -X POST https://transapp-dev.ru/payment-api/api/calculate-commission -d '{"amount":500}'` returns valid JSON with kazna+transapp commissions. SSL cert from Yandex Certificate Manager working end-to-end. Final SA role set: 7 roles (`container-registry.images.{pusher,puller}`, `compute.editor`, `certificate-manager.certificates.downloader`, `vpc.user`, `vpc.publicAdmin`, `iam.serviceAccounts.user`). |
| Container Registry lifecycle policy | ✅ done (2026-04-28) | Created via UI under personal admin account (SA intentionally lacks `container-registry.editor` — see § "Why not via CI service account"). Name `cleanup-default`, status Active, 4 rules per § "Recommended policy for `transapp-web` (ready-to-paste)". First lifecycle check (id `crp5lpr4spivbho2qn9o`, 19:19 MSK) reported **0 matching images** — both deployed images (`<sha>-nginx` + `<sha>-payment` from first deploy) are <30 days old and within `retained_top: 10` per-service. Policy is dormant on a fresh repo by design; will start retiring oldest sha/service pairs once we exceed 10 SHAs per service AND those images cross 30 days. |
| First GitHub Release | ❌ pending | Phase 2, after `app.transapp.ru` cohabitation is wired |
| Payment endpoint path conventions | 🛠 plan ready | Двойной `/api` (`/payment-api/api/...`) на стейдже — план чистки готов: `.claude/plans/2026-04-29-payment-api-path-cleanup.md` (Status: ready, awaiting approval). Решение — nginx-side fix (Option A): `proxy_pass http://payment-service:8000/api/`. Litestar контракт не меняется. Попутно чинится латентный web-prod баг (`api.web.ts:23` шлёт URL без `/api`, который сегодня не матчится). |

---

## Glossary of pipeline terms (project-specific)

- **COI VM** — Container Optimized Image VM in Yandex Cloud. Boots with Docker
  and a `docker-compose.yaml` already running, no SSH needed for normal ops.
- **`yc-actions/yc-coi-deploy@v2`** — the official Yandex Cloud GitHub Action
  that creates or updates a COI VM. Idempotent: re-running with the same
  `vm-name` updates the existing VM in place.
- **`workflow_dispatch`** — manual "Run workflow" button trigger.
- **`release: [created]`** — fires when a GitHub Release is published, **not**
  on plain `git tag` push.
