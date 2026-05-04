#!/bin/bash
# StrongSwan client entrypoint — renders /etc/ipsec.{conf,secrets} from
# env vars and starts the IKE daemon in foreground (Docker PID 1).
#
# Inputs (env, set in docker-compose.yc.yaml from GitHub Secrets):
#   EAP_USERNAME — VPN account username
#   EAP_PASSWORD — VPN account password
#
# Files baked into the image:
#   /etc/ipsec.d/cacerts/ca.pem — upstream VPN server CA (public)
#   /etc/ipsec.conf.template     — split-tunnel config skeleton
#
# Output side effects:
#   /etc/ipsec.conf            — rendered from template
#   /etc/ipsec.secrets         — chmod 600 (creds in plain text on
#                                tmpfs container layer; never persisted)
#
# Behaviour:
#   - aborts immediately if EAP_USERNAME / EAP_PASSWORD is missing
#     (no point starting; would silently fail at IKE auth)
#   - escapes backslashes and double-quotes inside the password to
#     keep ipsec.secrets parseable
#   - replaces own PID with `ipsec start --nofork` so Docker sees
#     charon as PID 1 (correct signal handling on container stop)

set -euo pipefail

if [[ -z "${EAP_USERNAME:-}" || -z "${EAP_PASSWORD:-}" ]]; then
    echo "FATAL: EAP_USERNAME / EAP_PASSWORD env not set" >&2
    exit 1
fi

# Render conf — sed-substitute the username placeholder. Username is
# expected to be a simple identifier (no `&`, `/` etc); if it ever
# contains those, switch to a different separator or use envsubst.
sed "s|__EAP_USERNAME__|${EAP_USERNAME}|g" \
    /etc/ipsec.conf.template > /etc/ipsec.conf

# Render secrets. Format: `<id> : EAP "<password>"`. Escape \ and "
# inside the password so the parser doesn't lose terminating quotes.
escaped_password="${EAP_PASSWORD//\\/\\\\}"
escaped_password="${escaped_password//\"/\\\"}"
echo "${EAP_USERNAME} : EAP \"${escaped_password}\"" > /etc/ipsec.secrets
chmod 600 /etc/ipsec.secrets

# Foreground IKE daemon — Docker container PID 1. SIGTERM on `docker
# stop` reaches charon directly; no reaping zombies via shell.
exec ipsec start --nofork
