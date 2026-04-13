# Project Overview

<!-- Content to be migrated from /docs/ARCHITECTURE.md -->

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Mobile App     │────▶│  transapp.ru API  │     │  Kazna API   │
│  (RN + Expo)    │     │  (main backend)   │     │  (payments)  │
└─────────────────┘     └──────────────────┘     └──────────────┘
        │                                               ▲
        │               ┌──────────────────┐            │
        └──────────────▶│  Payment Service │────────────┘
                        │  (Litestar+PG)   │
                        └──────────────────┘
```

## Platforms

- iOS (>= 15.1)
- Android
- Web (Expo web + legacy transappweb)

## Key Integrations

- **Kazna API** — government payment system
- **Firebase** — push notifications
- **Yandex Maps** — maps and geolocation
