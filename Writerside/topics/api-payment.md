# Payment API

## Base URL

- Local: `http://localhost:8001/api`
- Production: configured via environment

## Endpoints

### POST /api/init-payment

Initialize single fine payment.

**Request:**
```json
{
  "uin": "string",
  "amount": 500.00
}
```

### POST /api/init-multi-payment

Initialize multi-UIN payment.

**Request:**
```json
{
  "items": [
    { "uin": "string", "amount": 250.00 },
    { "uin": "string", "amount": 250.00 }
  ]
}
```

### POST /api/calculate-commission

Calculate commission for a payment.

### POST /api/calculate-multi-commission

Calculate commission for multi-payment.

### GET /api/payment-status/{id}

Check payment status by transaction UUID.

### POST /api/notify

Kazna webhook callback (server-to-server).
