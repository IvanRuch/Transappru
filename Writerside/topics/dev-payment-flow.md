# Payment Flow

<!-- Content to be migrated from /docs/FINE_PAYMENT_INTEGRATION.md -->

## Overview

Mobile selects fines → Payment Service initiates Kazna API payment → Kazna webhook confirms → Mobile shows result.

## Flow Diagram

```
Mobile App          Payment Service         Kazna API
    │                     │                     │
    │  init-payment       │                     │
    │────────────────────▶│                     │
    │                     │  create order        │
    │                     │────────────────────▶│
    │                     │  payment URL         │
    │  ◀────────────────── │◀────────────────────│
    │                     │                     │
    │  WebView payment    │                     │
    │  ──────────────────────────────────────── │
    │                     │                     │
    │                     │  webhook /notify     │
    │                     │◀────────────────────│
    │  status update      │                     │
    │◀────────────────────│                     │
```
