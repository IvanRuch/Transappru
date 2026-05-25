#!/bin/sh
set -e

# *** AUTHORITATIVE PRODUCTION NGINX CONFIG ***
# In HTTPS mode (YC_CERT_ID set — always-true in production), the heredoc
# NGINX_CONF below overwrites /etc/nginx/nginx.conf at container startup.
# The sibling file nginx/nginx.prod.conf is used ONLY as HTTP fallback
# when YC_CERT_ID is empty (never in prod). Keep both files in sync when
# editing nginx routing. See ADR-026.

# If YC_CERT_ID is set, fetch certificate from Yandex Certificate Manager
if [ -n "$YC_CERT_ID" ]; then
  echo "=== Fetching SSL certificate from Yandex Certificate Manager ==="

  # Get IAM token from VM metadata service
  IAM_TOKEN=$(curl -sf -H "Metadata-Flavor: Google" \
    http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token \
    | jq -r .access_token)

  if [ -z "$IAM_TOKEN" ] || [ "$IAM_TOKEN" = "null" ]; then
    echo "ERROR: Failed to get IAM token from metadata service"
    echo "=== Starting nginx without SSL ==="
    exec nginx -g "daemon off;"
  fi

  echo "=== IAM token obtained ==="

  # Fetch certificate content
  RESPONSE=$(curl -sf \
    -H "Authorization: Bearer ${IAM_TOKEN}" \
    "https://data.certificate-manager.api.cloud.yandex.net/certificate-manager/v1/certificates/${YC_CERT_ID}:getContent")

  if [ -z "$RESPONSE" ]; then
    echo "ERROR: Failed to fetch certificate ${YC_CERT_ID}"
    echo "=== Starting nginx without SSL ==="
    exec nginx -g "daemon off;"
  fi

  # Write certificate files
  mkdir -p /etc/ssl/yc
  echo "$RESPONSE" | jq -r '.certificateChain[]' > /etc/ssl/yc/fullchain.pem
  echo "$RESPONSE" | jq -r '.privateKey' > /etc/ssl/yc/privkey.pem
  chmod 600 /etc/ssl/yc/privkey.pem

  CERT_SIZE=$(wc -c < /etc/ssl/yc/fullchain.pem)
  KEY_SIZE=$(wc -c < /etc/ssl/yc/privkey.pem)
  echo "=== Certificate saved: fullchain=${CERT_SIZE}B, key=${KEY_SIZE}B ==="

  # Generate nginx config with HTTPS + HTTP redirect
  cat > /etc/nginx/nginx.conf <<'NGINX_CONF'
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # Upstream for the external TransApp API (legacy perl backend).
    # transapp.ru is the production-apex vhost (185.76.253.6). Named by
    # hostname rather than IP so backend vhost selection by Host header
    # (used by Ivan's nginx) stays consistent with proxy_set_header below.
    # keepalive 16 pools TLS connections — requires proxy_http_version
    # 1.1 + empty Connection header in the location block. See ADR-025
    # (fix) and ADR-026 (correction: this block must live HERE, not in
    # nginx.prod.conf which is HTTP-fallback only).
    upstream main_api {
        server transapp.ru:443;
        keepalive 16;
    }

    # HTTP — redirect to HTTPS (except health check)
    server {
        listen 80;
        server_name _;

        location /health {
            access_log off;
            return 200 'ok';
            add_header Content-Type text/plain;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     /etc/ssl/yc/fullchain.pem;
        ssl_certificate_key /etc/ssl/yc/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000" always;
        # Other security headers (X-Frame-Options, X-Content-Type-Options,
        # Referrer-Policy, Permissions-Policy, CSP). HSTS lives directly on
        # the server because it is HTTPS-only — the rest are scheme-agnostic
        # and shared with the HTTP fallback config.
        include /etc/nginx/security-headers.partial.conf;

        root /usr/share/nginx/html;
        index index.html;

        # Static assets — long cache (Expo adds content hash)
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            include /etc/nginx/security-headers.partial.conf;
        }

        # Favicon set + PWA assets
        location = /favicon.ico {
            expires 1y;
            add_header Cache-Control "public, immutable";
            include /etc/nginx/security-headers.partial.conf;
        }
        location ~ ^/(favicon-(?:16|32)|apple-touch-icon|icon-(?:192|512))\.png$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            include /etc/nginx/security-headers.partial.conf;
        }
        location = /manifest.webmanifest {
            default_type application/manifest+json;
            add_header Cache-Control "public, max-age=3600";
            include /etc/nginx/security-headers.partial.conf;
        }
        location = /robots.txt {
            default_type text/plain;
            add_header Cache-Control "public, max-age=3600";
            include /etc/nginx/security-headers.partial.conf;
        }
        location = /firebase-messaging-sw.js {
            default_type application/javascript;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Service-Worker-Allowed "/";
            include /etc/nginx/security-headers.partial.conf;
        }

        # Main TransApp API proxy — targets the production-apex vhost
        # (transapp.ru → 185.76.253.6) via the main_api upstream. Before
        # ADR-025 this pointed at ivan.trans-konsalt.ru (staging vhost,
        # 185.76.253.4) — a dev-config leftover from the lk.transapp.ru
        # cutover (2026-05-14, ADR-017) that silently served prod web
        # users from staging until 2026-05-20. ADR-026 corrects ADR-025's
        # location: this heredoc — not nginx.prod.conf — is what runs in
        # prod. proxy_http_version 1.1 + empty Connection header activate
        # the keepalive pool on `upstream main_api`.
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

        # Payment service API proxy.
        # Public shape: /payment-api/<endpoint>  ->  upstream: /api/<endpoint>
        # Litestar PaymentController keeps its internal /api/ namespace;
        # nginx adds the prefix back when proxying. See ADR-008 + plan
        # 2026-04-29-payment-api-path-cleanup.md for rationale.
        location /payment-api/ {
            proxy_pass http://payment-service:8000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            proxy_connect_timeout 10s;
        }

        # Health check
        location /health {
            access_log off;
            return 200 'ok';
            add_header Content-Type text/plain;
            include /etc/nginx/security-headers.partial.conf;
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Prevent caching of index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
            include /etc/nginx/security-headers.partial.conf;
        }
    }
}
NGINX_CONF

  echo "=== HTTPS enabled ==="
else
  echo "=== YC_CERT_ID not set, running HTTP-only ==="
fi

exec nginx -g "daemon off;"
