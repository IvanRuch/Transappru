# Telegram egress via StrongSwan IPsec sidecar

> Operational guide for the `vpn` Docker container that gives the
> `payment-bot` sidecar access to `api.telegram.org` from our
> RU-located Yandex Cloud VM. See [ADR-015](decision-log.md) for the
> design rationale and alternatives considered.

## Why this exists

`api.telegram.org` is unreachable from RU IP ranges. Our staging
(and eventual production) lives on Yandex Cloud RU. Without an
overlay, the bot sees `connection refused` / timeouts on every
outbound TG call.

## Architecture (60-second tour)

```
Yandex Cloud COI VM
│
├─ payment-service ──▶ Kazna (RU)        (default route, no VPN)
│                  ──▶ payment-db        (Docker bridge)
│
├─ vpn (StrongSwan IPsec client, sidecar)
│   └─ rightsubnet=149.154.160.0/20,91.108.4.0/22
│      (only Telegram CIDRs go through the tunnel; everything else
│       — including reaching payment-db — uses the default route)
│
└─ payment-bot
    network_mode: "service:vpn"        (joins vpn's namespace)
       ├─ inbound from payment-db      (Docker bridge, default route)
       └─ outbound api.telegram.org    (IPsec tunnel via 31.44.2.124)
```

## Files

| Path | Role |
|---|---|
| `infra/strongswan/Dockerfile` | Alpine + `apk strongswan iproute2 bash` |
| `infra/strongswan/ipsec.conf.template` | IKEv2 + EAP-MSCHAPv2, split-tunnel `rightsubnet` |
| `infra/strongswan/entrypoint.sh` | Renders `/etc/ipsec.conf` + `/etc/ipsec.secrets` from env, exec `ipsec start --nofork` |
| `infra/strongswan/ca.pem` | CA cert of upstream VPN server (public) |
| `yandex-cloud/docker-compose.yc.yaml` | `vpn` service definition + `payment-bot` shared namespace |
| `.github/workflows/deploy-web.yml` | `build-vpn` job + `STRONGSWAN_EAP_*` env wiring |

## Required GitHub Secrets

| Secret | What |
|---|---|
| `STRONGSWAN_EAP_USERNAME` | EAP-MSCHAPv2 account username |
| `STRONGSWAN_EAP_PASSWORD` | EAP-MSCHAPv2 account password |

Both are read from `env:` block in `deploy-web.yml` and injected into
the `vpn` container via `docker-compose.yc.yaml` template
substitution. **Never inlined as `${{ secrets.X }}` directly into a
run-script** (lesson learned in PR #25 — see ADR-012).

## Operational verification

### After deploy

```bash
yc compute ssh --id <staging-vm-id>

# 1. VPN tunnel established
docker exec transapp_vpn ipsec status
# expected:
#   telegram-vpn[1]: ESTABLISHED ...
#   telegram-vpn{1}: ... 149.154.160.0/20 91.108.4.0/22

# 2. Telegram reachable from bot's namespace
docker exec transapp_payment_bot \
  curl -s -o /dev/null -w '%{http_code}\n' https://api.telegram.org
# expected: 302

# 3. payment-db still reachable from bot's namespace
docker exec transapp_payment_bot \
  python3 -c "import socket; print(socket.gethostbyname('payment-db'))"
# expected: an internal Docker bridge IP (172.x.y.z)

# 4. End-to-end: provoke a complaint, watch TG
curl -s -X POST -H 'content-type: application/json' \
  -d '{"user_id":1,"auto_id":1,"category":"fines","comment":"smoke"}' \
  https://transapp-dev.ru/payment-api/data-issues/report
# expected: 201; within 5s the admin chat with @transappmonitor_bot
# receives a card with [Активировать баннер] [Закрыть жалобу] keyboard
```

### Logs to watch

```bash
docker logs transapp_vpn        --tail 50    # IKE handshake, child SAs
docker logs transapp_payment_bot --tail 50   # poll_alerts.start / .send_failed
```

`poll_alerts.start interval_sec=5.0 initial_max_id=N` — bot is
running and skipped pre-existing N rows (cold-start replay protection).

## Failure modes

| Symptom | Diagnosis | Recovery |
|---|---|---|
| `transapp_vpn` exits at start with `FATAL: EAP_USERNAME / EAP_PASSWORD env not set` | GitHub Secrets not configured or empty | Add `STRONGSWAN_EAP_USERNAME` / `STRONGSWAN_EAP_PASSWORD` and re-deploy |
| `ipsec status` shows no `ESTABLISHED` after 30s | Wrong EAP creds, or upstream VPN server down, or firewall blocking IKE 500/4500 to `31.44.2.124` | Check creds in StrongSwan admin panel; confirm `ping 31.44.2.124` from VM works; check `docker logs transapp_vpn` for `IKE_AUTH failed` |
| `curl https://api.telegram.org` from bot returns timeout | Tunnel up but routing not propagated; or rightsubnet doesn't cover Telegram's actual IP | `docker exec transapp_vpn ip route` should list `149.154.160.0/20 dev xfrm…`. If missing — restart vpn container |
| Admin alerts stop arriving but tunnel is up | TG rate-limit, bot blocked, or token rotated | Check `docker logs transapp_payment_bot` for `poll_alerts.send_failed`; complaints stay in DB and resume sending automatically once recovered |
| payment-bot can't reach payment-db | vpn container's default route doesn't include the Docker bridge | Restart whole compose; verify `docker exec transapp_vpn ip route` has a default route via `eth0` |

## Latency expectations

- **Admin alert**: ≤ 5s from `INSERT` (poll_alerts cadence
  `POLL_INTERVAL_SEC=5.0`).
- **Bot inbound (commands `/banner_on …`)**: ≤ 1s typical (aiogram
  `start_polling` long-poll, getUpdates loop).

## What's NOT in the VPN namespace

- **payment-service** — talks to Kazna (RU). Default route only.
- **nginx** — public reverse-proxy, no outbound besides static.
- **payment-db** — internal, no outbound.
- **Firebase recovery push** — FCM endpoints (`fcm.googleapis.com`,
  `oauth2.googleapis.com`) are NOT RU-blocked, work through default
  route from the bot. The bot calls FCM Admin SDK from inside the
  vpn namespace, but that traffic doesn't match `rightsubnet` so it
  exits via the default route.

## Recovery push and the VPN

The VPN's `rightsubnet` is intentionally narrow — only Telegram.
FCM lives on Google's networks (`fcm.googleapis.com` resolves to
`142.250.x.x`), which doesn't match. The kernel routes that traffic
via the default Docker bridge → host eth0 → Yandex Cloud egress.
This means **recovery push works regardless of VPN state** — even if
`transapp_vpn` is down, `/banner_off … → push N юзерам` continues
to function. Only inbound TG (admin commands) and outbound TG
(admin alerts) require the tunnel to be up.

## Maintenance

### Rotating EAP credentials

1. Generate new password on StrongSwan admin panel (Varenuha server).
2. Update GitHub Secret `STRONGSWAN_EAP_PASSWORD`.
3. Trigger `workflow_dispatch deploy-web.yml`. New `vpn` image is
   built with no creds inside (creds are env-only) → docker-compose
   restart applies the new password from updated env.

### Updating Telegram CIDRs

If Telegram publishes new IP ranges and the current `rightsubnet`
becomes incomplete, edit `infra/strongswan/ipsec.conf.template`,
re-deploy. **Coordinate with the upstream VPN server's firewall** —
adding routes here without matching the server-side accept list
breaks the tunnel.

Current Telegram source of truth:
<https://core.telegram.org/resources/cidr.txt>

### Symptom: bot in `Failed to fetch updates - Request timeout` loop

If `docker logs transapp_payment_bot` shows repeated
`aiogram.dispatcher: Failed to fetch updates - TelegramNetworkError`
AND `app.bot.poll_alerts: poll_alerts.send_failed`, but
`docker exec transapp_payment_bot curl -s -o /dev/null -w '%{http_code}'
https://api.telegram.org` sometimes returns `302` —
**`rightsubnet` is incomplete**.

Telegram DNS rotates `api.telegram.org` across DCs 1–5; some IPs
fall outside our routed CIDRs and traffic exits via default route →
blocked at YC NAT/firewall (RU). Symptom is intermittent for low-rate
clients (krasilnikov-style ~2 msg/day), but a long-poll `getUpdates`
cycle hits the bad DC reliably within a few iterations.

Fix: ensure `rightsubnet` covers the **full** list at
<https://core.telegram.org/resources/cidr.txt>. Re-confirm with the
VPN server admin that `leftsubnet` accepts all of them — if narrow,
ask to widen.

A secondary IPv6 contribution: `aiohttp`'s `aiohappyeyeballs` races
A + AAAA results. Our split-tunnel covers IPv4 only, so AAAA-routed
attempts time out. `entrypoint.sh` disables IPv6 in the vpn netns
via `sysctl net.ipv6.conf.all.disable_ipv6=1` (best-effort, requires
CAP_NET_ADMIN).

### Migrating off the VPN

If Telegram unblocks RU egress (unlikely) or production moves to a
non-RU host:

1. Remove `vpn` service from `docker-compose.yc.yaml`.
2. Drop `network_mode: "service:vpn"` from `payment-bot`.
3. Move admin-alert dispatch back from poll-loop to inline call in
   `payment-service/app/controllers/data_issues.py:report` (revert
   ADR-015 cleanup).
4. Remove `build-vpn` job + STRONGSWAN env vars from `deploy-web.yml`.
5. Delete `infra/strongswan/`.

Single PR, ~10 file changes. The bot's `poll_alerts.py` should be
deleted entirely (was a coping mechanism for VPN-only egress).
