# StrongSwan IPsec client for split-tunnel routing of Telegram API
# traffic through an upstream StrongSwan server. Used as a sidecar by
# `payment-bot` in `yandex-cloud/docker-compose.yc.yaml` — the bot
# shares this container's network namespace via
# `network_mode: "service:vpn"`.
#
# Why a custom build instead of an existing public image: maintained
# StrongSwan-as-client images are sparse and often abandoned upstream.
# A short Alpine recipe is auditable, pinned to our exact use case
# (EAP-MSCHAPv2 client + split-tunnel `rightsubnet` for Telegram subnets
# 149.154.160.0/20 + 91.108.4.0/22) and free of vendor surprises.
#
# See ADR-015 for the rationale behind running this on the COI VM as
# a sidecar instead of installing strongSwan on the host (COI has no
# `apt` and no managed systemd-strongswan).
FROM alpine:3.20

RUN apk add --no-cache \
        strongswan \
        iproute2 \
        bash \
    && rm -rf /var/cache/apk/*

# CA certificate of the upstream VPN server (public — distributed to
# all clients). Charon trusts the server iff this cert is in cacerts.
COPY ca.pem /etc/ipsec.d/cacerts/ca.pem

# Conf template — `__EAP_USERNAME__` placeholder is substituted at
# container start by the entrypoint (env-driven so the username can
# be rotated without rebuilding the image).
COPY ipsec.conf.template /etc/ipsec.conf.template

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# strongSwan needs CAP_NET_ADMIN to add IPsec/SAs and modify routing
# table; the cap is granted by `cap_add` in docker-compose.yc.yaml.
ENTRYPOINT ["/entrypoint.sh"]
