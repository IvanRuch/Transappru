"""
Tests for POST /api/notify — Kazna webhook callback.

Coverage rationale (see plan 2026-04-29-payment-api-path-cleanup.md):
The endpoint is reserved for Phase 3 cutover — Kazna does not currently
call it. We test it now to keep this code path from rotting silently;
when we hand a URL to Kazna manager and the channel goes live, the
contract will already be guaranteed by these tests.

Signature contract (from app/services/kazna.py:133-136):
    md5(token + paymentID + status.name) == sign

We use the default settings.KAZNA_TOKEN ("testservice") in the test env.
"""

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.config.settings import settings
from app.models import PaymentTransaction, PaymentTransactionItem
from app.services.kazna import kazna_service


def _calc_notify_sign(payment_id: int, status_name: str) -> str:
    """Helper: build the same signature Kazna would send for a notify push."""
    raw = f"{settings.KAZNA_TOKEN}{payment_id}{status_name}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


class TestNotifySignatureFormula:
    """Direct unit-level test on `verify_notification_sign` — independent of HTTP."""

    def test_valid_signature_is_accepted(self) -> None:
        sign = _calc_notify_sign(payment_id=12345, status_name="auth")
        assert (
            kazna_service.verify_notification_sign(
                payment_id=12345, status_name="auth", sign=sign
            )
            is True
        )

    def test_invalid_signature_is_rejected(self) -> None:
        assert (
            kazna_service.verify_notification_sign(
                payment_id=12345, status_name="auth", sign="not-a-real-sign"
            )
            is False
        )

    def test_signature_is_md5_of_token_paymentid_statusname(self) -> None:
        # Explicitly pin the formula. If anyone changes the algorithm, this
        # test fails and forces a conscious decision.
        expected = hashlib.md5(
            f"{settings.KAZNA_TOKEN}999pending".encode("utf-8")
        ).hexdigest()
        assert (
            kazna_service.verify_notification_sign(
                payment_id=999, status_name="pending", sign=expected
            )
            is True
        )


class TestNotifyEndpoint:
    """HTTP-level tests against POST /api/notify."""

    async def test_invalid_signature_returns_error_payload(self, client) -> None:
        response = await client.post(
            "/api/notify",
            json={
                "paymentID": 1,
                "orderID": "x",
                "status": {"code": 0, "name": "created"},
                "sign": "definitely-not-valid",
            },
        )
        # Endpoint returns 200 with a soft error to avoid Kazna retrying
        # forever on signature mismatches caused by misconfiguration on
        # their side.
        assert response.status_code == 201
        assert response.json() == {"status": "error", "message": "Invalid signature"}

    async def test_unknown_order_id_with_valid_signature_is_acked(self, client) -> None:
        sign = _calc_notify_sign(payment_id=42, status_name="auth")
        unknown_order = str(uuid.uuid4())
        response = await client.post(
            "/api/notify",
            json={
                "paymentID": 42,
                "orderID": unknown_order,
                "status": {"code": 0, "name": "auth"},
                "sign": sign,
            },
        )
        # Per controller behaviour (payment.py:430-433), an unknown orderID
        # is acked with status:ok — no DB row to mutate, but we don't want
        # Kazna to keep retrying.
        assert response.status_code == 201
        assert response.json() == {"status": "ok"}

    async def test_paid_status_marks_transaction_and_items(self, client) -> None:
        order_id = str(uuid.uuid4())
        kazna_payment_id = 7777

        transaction = await PaymentTransaction.create(
            id=order_id,
            amount=Decimal("100.00"),
            description="test",
            uin="UIN-A,UIN-B",
            uin_count=2,
            kazna_status="pending",
            kazna_payment_id=str(kazna_payment_id),
        )
        await PaymentTransactionItem.create(
            transaction=transaction,
            uin="UIN-A",
            amount=Decimal("50.00"),
            status="pending",
        )
        await PaymentTransactionItem.create(
            transaction=transaction,
            uin="UIN-B",
            amount=Decimal("50.00"),
            status="pending",
        )

        sign = _calc_notify_sign(payment_id=kazna_payment_id, status_name="paid")
        paid_at = datetime(2026, 4, 29, 12, 0, 0, tzinfo=timezone.utc).isoformat()

        response = await client.post(
            "/api/notify",
            json={
                "paymentID": kazna_payment_id,
                "orderID": order_id,
                "status": {"code": 0, "name": "paid", "date": paid_at},
                "sign": sign,
            },
        )
        assert response.status_code == 201
        assert response.json() == {"status": "ok"}

        await transaction.refresh_from_db()
        assert transaction.kazna_status == "paid"

        items = await PaymentTransactionItem.filter(transaction=transaction).all()
        assert len(items) == 2
        for item in items:
            assert item.status == "paid"
            assert item.paid_at is not None

    async def test_cancelled_status_marks_transaction_and_items(self, client) -> None:
        order_id = str(uuid.uuid4())
        kazna_payment_id = 8888

        transaction = await PaymentTransaction.create(
            id=order_id,
            amount=Decimal("250.00"),
            description="test cancel",
            uin="UIN-X",
            uin_count=1,
            kazna_status="pending",
            kazna_payment_id=str(kazna_payment_id),
        )
        await PaymentTransactionItem.create(
            transaction=transaction,
            uin="UIN-X",
            amount=Decimal("250.00"),
            status="pending",
        )

        sign = _calc_notify_sign(payment_id=kazna_payment_id, status_name="cancelled")

        response = await client.post(
            "/api/notify",
            json={
                "paymentID": kazna_payment_id,
                "orderID": order_id,
                "status": {"code": 0, "name": "cancelled"},
                "sign": sign,
            },
        )
        assert response.status_code == 201
        assert response.json() == {"status": "ok"}

        await transaction.refresh_from_db()
        assert transaction.kazna_status == "cancelled"

        items = await PaymentTransactionItem.filter(transaction=transaction).all()
        assert all(item.status == "cancelled" for item in items)
