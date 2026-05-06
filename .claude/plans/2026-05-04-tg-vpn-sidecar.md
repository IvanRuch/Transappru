# Telegram via StrongSwan IPsec sidecar (ADR-015)

## Status

**Completed** (2026-05-05). ADR-015.

Original trigger (2026-05-04): failed manual QA — smoke POST to
`/payment-api/data-issues/report` returned 201, but the admin TG card
never arrived. Root cause: api.telegram.org is unreachable from RU IP
ranges — our staging VM lives on Yandex Cloud (RU), so payment-service's
outbound TG call silently times out. The only way out was a VPN tunnel
to a non-RU egress.

Shipped:
- PR #26 (`7d4b1ec`) — StrongSwan IPsec sidecar + payment-bot via
  `network_mode: "service:vpn"` + bot poll-loop with high-water-mark
  cold-start + `build-vpn` CI job + 8 new pytest cases
  (`test_poll_alerts.py`, suite 54/54 green).
- PR #27 (`19378a8`) — `rightsubnet` expanded to all Telegram CIDRs +
  IPv6 disabled in netns (initial `rightsubnet` was too narrow; some
  Telegram bot endpoints fell outside).
- PR #29 (`1bb9f27`) — `BUILD_ID` env-buster для COI metadata-diff cache
  (см. ADR-016) — без него COI daemon не replay-ил compose changes между
  workflow_dispatch re-run на том же git SHA.
- Adjacent: PR #28 (`fe9f790`) — независимый bot fix: unbreak `/help`,
  escape user comments, tombstone dead FCM tokens.

End-to-end проверено в production на staging:
1. `docker exec transapp_vpn ipsec status` → `ESTABLISHED`
2. `curl POST /payment-api/data-issues/report` → 201 → admin TG card
   приходит в течение 5 секунд
3. Cold restart payment-bot — pre-existing complaints не replay-ятся

Open / deferred остаются как в плане (permanent send failure → infinite
retry; LISTEN/NOTIFY для sub-second latency; vpn healthcheck).

The neighboring `krasilnikov-bitrix-teleg-bot` project hit the same
wall and solved it with StrongSwan IKEv2 + EAP-MSCHAPv2 to the same
upstream VPN server (`31.44.2.124`). Their VM is Ubuntu — they
installed strongswan via apt. Ours is COI (Container-Optimized Image
from Yandex), no `apt`. We adapt the same network design but ship
strongSwan as a Docker sidecar.

## Context

- **Workflow `deploy-web.yml`** uses `yc-actions/yc-coi-deploy@v2` →
  COI VM. No `apt`, no traditional systemd-strongswan, just Docker.
- **payment-service** outbound includes Kazna API (`demopay.oplatagosuslug.ru`,
  RU). It must NOT route through a US VPN tunnel (would break / be
  slow / Kazna may policy-block foreign IPs).
- **payment-bot** outbound is ONLY api.telegram.org (long-poll
  getUpdates + send admin alerts + recovery push). Perfect candidate
  to live behind the VPN.
- **Admin alerts on new complaints** were originally sent inline from
  `payment-service.controllers.data_issues.report` — that path is now
  dead (RU egress) and must move to `payment-bot`.

## Architecture

```
                                                ┌────────────────────────┐
                                                │ Yandex Cloud COI VM    │
client (mobile/web) ──HTTPS──▶ nginx ──▶ payment-service               │
                                                │     │                  │
                                                │     ▼  default route   │
                                                │   eth0 ──▶ Kazna (RU) │
                                                │     │                  │
                                                │     │  INSERT          │
                                                │     ▼                  │
                                                │   payment-db (Postgres)│
                                                │     ▲                  │
                                                │     │ poll every 5s    │
                                                │     │                  │
                                                │  ┌──┴──┐               │
                                                │  │ vpn │ (StrongSwan)  │
                                                │  │     │ IKEv2 +       │
                                                │  │     │ EAP-MSCHAPv2  │
                                                │  └──▲──┘               │
                                                │     │ shared netns     │
                                                │     │                  │
                                                │  payment-bot           │
                                                │     │                  │
                                                │     ▼                  │
                                                │   eth0 (VPN)           │
                                                └─────┬──────────────────┘
                                                      │
                                                      ▼
                                                 IPsec tunnel
                                                      │
                                                      ▼ rightsubnet only
                                              ┌────────────────────┐
                                              │  31.44.2.124       │
                                              │  Varenuha VPN srv  │
                                              │  (US)              │
                                              └─────────┬──────────┘
                                                        │
                                                        ▼
                                                api.telegram.org
                                                149.154.160.0/20
                                                 91.108.4.0/22
```

### Split-tunnel routing (key)

`rightsubnet=149.154.160.0/20,91.108.4.0/22` in `/etc/ipsec.conf`. ONLY
Telegram CIDRs go through the tunnel; everything else (e.g. payment-db
on the Docker bridge, Yandex Cloud metadata service, NTP, OS package
updates) uses default route. Same approach as krasilnikov.

### Network namespace sharing

`payment-bot` joins the vpn container's namespace via
`network_mode: "service:vpn"`. Implications:
- payment-bot inherits vpn's interfaces, IPs, routing table.
- Telegram outbound → tunnel.
- payment-db hostname resolution: vpn container is on the default
  Docker network (compose creates it implicitly), payment-db is
  reachable via Docker DNS — payment-bot through shared namespace
  uses the same resolver.
- payment-bot loses its own port mappings (none anyway — no inbound).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | StrongSwan client as Docker sidecar (alpine + apk strongswan) | COI VM has no `apt`; custom 30-line Dockerfile is auditable, pinned to our use case |
| 2 | `network_mode: "service:vpn"` for payment-bot | Cleanest way to apply split-tunnel routing without modifying host |
| 3 | Move admin-alert dispatch from payment-service to payment-bot via DB poll | payment-service can't reach TG (RU); payment-bot can; DB is the natural queue |
| 4 | Poll-loop with 5s interval + high-water mark on startup | ~1 incident/month makes ms-latency irrelevant; high-water prevents replaying months of complaints on cold start |
| 5 | Send-failure → don't advance high-water → retry on next poll | Single transient blip must not silently drop a complaint |
| 6 | Bake CA cert into VPN image, EAP creds via env | Cert is public (CA cert distributed to all clients); creds rotate independently of image rebuild |
| 7 | EAP creds via GitHub Secrets → docker-compose.yc.yaml `env:` block (NOT inline `${{ }}`) | Same lesson learned in PR #25 with FIREBASE_SERVER_ACCOUNT_JSON: env: block protects against shell metacharacter syntax errors |
| 8 | Firebase recovery push stays on payment-bot (not VPN-only) | FCM endpoints are NOT RU-blocked; recovery push works regardless of VPN — both before AND after VPN comes online |

## Implementation surface

| Layer | Files |
|---|---|
| VPN sidecar | `infra/strongswan/{Dockerfile,entrypoint.sh,ipsec.conf.template,ca.pem}` |
| Bot poll-loop | `payment-service/app/bot/poll_alerts.py` (new) |
| Bot lifecycle | `payment-service/app/bot/bot_worker.py` (asyncio.gather dispatcher + poll-loop) |
| Notify formatting | `payment-service/app/bot/notify.py` (refactored to pure formatter) |
| Controller cleanup | `payment-service/app/controllers/data_issues.py` (remove send_admin_alert) |
| Production compose | `yandex-cloud/docker-compose.yc.yaml` (new vpn service + payment-bot shared namespace) |
| Deploy CI | `.github/workflows/deploy-web.yml` (new build-vpn job + STRONGSWAN_EAP_* env vars) |
| Tests | `payment-service/tests/test_poll_alerts.py` (8 new cases) |
| Docs | ADR-015 + `infra-vpn-telegram.md` + dashboard entry + this plan |

## Required GitHub Secrets

- `STRONGSWAN_EAP_USERNAME` — VPN account username
- `STRONGSWAN_EAP_PASSWORD` — VPN account password

CA cert is committed at `infra/strongswan/ca.pem` (public).

## Verification

After merge + deploy:

1. **VPN container alive**: `docker exec transapp_vpn ipsec status` →
   `telegram-vpn[1]: ESTABLISHED ...`
2. **Telegram reachable from bot namespace**: `docker exec
   transapp_payment_bot curl -s -o /dev/null -w '%{http_code}'
   https://api.telegram.org` → `302`
3. **payment-db reachable from bot namespace**: bot logs show no
   "could not resolve payment-db" errors; alerts arrive in TG.
4. **End-to-end**: `curl POST /payment-api/data-issues/report …` →
   201 → within 5s the admin gets the TG alert with `[Активировать
   баннер] [Закрыть жалобу]` inline keyboard.
5. **Cold-start replay protection**: restart payment-bot →
   pre-existing complaints NOT re-sent; only NEW rows after start.
6. **Failure tolerance**: simulate brief VPN drop (`docker stop
   transapp_vpn` then `start` after 30s) → on `start`, the bot picks
   up missed complaints from the DB on the next poll.

## Open / deferred

- **Permanent send failure → infinite retry**. If a single complaint
  always fails (e.g. message too long after admin renames category in
  comment), poll loop spins on it forever. Acceptable at v1 (~1
  incident/month, transient errors only); add `notified_at` /
  `notify_attempts` columns + dead-letter when it bites.
- **Move to LISTEN/NOTIFY** for sub-second latency if business
  requires faster alerts.
- **Health probe** on vpn container — currently no `healthcheck`.
  At ~30 days mean time between incidents, eventual consistency from
  restart is sufficient. Add probe if VPN drops become noisy.
