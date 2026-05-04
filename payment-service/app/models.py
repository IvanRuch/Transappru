from tortoise import fields, models


class PaymentTransaction(models.Model):
    """
    Модель для хранения транзакций оплаты.
    """

    id = fields.UUIDField(pk=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    amount = fields.DecimalField(max_digits=10, decimal_places=2)
    description = fields.TextField(null=True)

    kazna_payment_id = fields.CharField(max_length=100, null=True, index=True)
    kazna_status = fields.CharField(max_length=50, default="created")

    # Храним список УИНов как строку для совместимости/быстрого просмотра,
    uin = fields.TextField()

    # Количество УИНов в транзакции
    uin_count = fields.IntField(default=1)

    class Meta:
        table = "payment_transactions"

    def __str__(self):
        return (
            f"Payment {self.id} (Kazna: {self.kazna_payment_id}) - {self.kazna_status}"
        )


class PaymentTransactionItem(models.Model):
    """
    Модель для отслеживания статуса каждого УИН в мультиоплате.
    """

    id = fields.IntField(pk=True)
    transaction = fields.ForeignKeyField(
        "models.PaymentTransaction", related_name="items", on_delete=fields.CASCADE
    )

    uin = fields.CharField(max_length=50, index=True)
    amount = fields.DecimalField(max_digits=10, decimal_places=2)

    # Статус оплаты конкретного УИН
    status = fields.CharField(
        max_length=50, default="pending"
    )  # pending, paid, failed, cancelled

    # Дата и время оплаты (когда Казна подтвердила)
    paid_at = fields.DatetimeField(null=True)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "payment_transaction_items"

    def __str__(self):
        return f"PaymentItem #{self.id}: UIN {self.uin} ({self.status})"


class CommissionRate(models.Model):
    """
    Тарифы комиссий с историей изменений.
    """

    id = fields.IntField(pk=True)
    service_type = fields.CharField(max_length=50)

    # Период действия
    valid_from = fields.DatetimeField(auto_now_add=True)
    valid_to = fields.DatetimeField(null=True)

    # Комиссия Казны
    kazna_percent = fields.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    kazna_min_amount = fields.IntField(default=0)

    # Комиссия TransApp
    transapp_percent = fields.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    transapp_min_amount = fields.IntField(default=0)

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "commission_rates"
        indexes = [
            ("service_type", "valid_to"),
        ]


# ---------------------------------------------------------------------------
# Data quality reporting + system notice banner
# Plan: .claude/plans/2026-05-04-data-issues-reporting.md
# Migration: migrations/002_data_issues_and_notice.sql
# ---------------------------------------------------------------------------

# Single source of truth for the six data categories the app surfaces.
# Mirrored on the frontend in src/constants/providerLabels.ts.
DATA_CATEGORIES: tuple[str, ...] = (
    "passes",
    "diagnostic_card",
    "fines",
    "osago",
    "rnis",
    "avtodor",
)

NOTICE_SOURCES: tuple[str, ...] = ("admin", "auto")

PUSH_STATUSES: tuple[str, ...] = ("success", "failure")


class SystemNotice(models.Model):
    """
    Active or historical banner shown to clients via GET /system-notice.

    A notice is "active" while deactivated_at IS NULL. The DB enforces
    a partial UNIQUE INDEX on `category` over the active subset, so two
    notices for the same category cannot coexist — see migration 002.

    `source='admin'` notices come from a Telegram admin command;
    `source='auto'` notices are created automatically when the per-category
    complaint threshold is reached. Both are deactivated only via explicit
    /banner_off — there is no TTL, by design (data quality issues persist
    until the operator confirms recovery).
    """

    id = fields.BigIntField(pk=True)
    category = fields.CharField(max_length=32)
    message = fields.TextField()
    source = fields.CharField(max_length=16)
    created_at = fields.DatetimeField(auto_now_add=True)
    deactivated_at = fields.DatetimeField(null=True)
    push_sent_at = fields.DatetimeField(null=True)
    push_recipient_count = fields.IntField(null=True)
    push_message = fields.TextField(null=True)

    class Meta:
        table = "system_notice"

    def __str__(self) -> str:
        active = "active" if self.deactivated_at is None else "closed"
        return f"SystemNotice #{self.id} {self.category} ({active}, {self.source})"


class DataIssue(models.Model):
    """
    A single user complaint about data quality for a given auto + category.

    `user_id` is trusted from the request body (no auth at the
    payment-service boundary — legacy DB unavailable). Spam protection
    relies on a partial UNIQUE INDEX (user_id, auto_id, category) WHERE
    resolved_at IS NULL: a re-click on the same category while the previous
    complaint is open returns HTTP 409.

    `fcm_token` (when present) is the device token at the moment of the
    complaint, used later for the recovery push when the corresponding
    notice is deactivated. `null` means the user denied push permission;
    they will not receive recovery notifications, by design.
    """

    id = fields.BigIntField(pk=True)
    user_id = fields.IntField()
    auto_id = fields.IntField()
    category = fields.CharField(max_length=32)
    comment = fields.TextField(null=True)
    fcm_token = fields.CharField(max_length=512, null=True)
    platform = fields.CharField(max_length=16, null=True)
    source_ip = fields.CharField(max_length=45, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    resolved_at = fields.DatetimeField(null=True)
    notice = fields.ForeignKeyField(
        "models.SystemNotice",
        related_name="issues",
        null=True,
        on_delete=fields.SET_NULL,
    )

    class Meta:
        table = "data_issues"

    def __str__(self) -> str:
        return (
            f"DataIssue #{self.id} user={self.user_id} auto={self.auto_id} "
            f"cat={self.category}"
        )


class SystemNoticePushLog(models.Model):
    """
    Per-recipient outcome of a recovery push fan-out triggered by
    /banner_off (after admin confirms in TG). Used for postmortems.
    """

    id = fields.BigIntField(pk=True)
    notice = fields.ForeignKeyField(
        "models.SystemNotice",
        related_name="push_log",
        on_delete=fields.CASCADE,
    )
    fcm_token = fields.CharField(max_length=512)
    status = fields.CharField(max_length=16)
    error_code = fields.CharField(max_length=64, null=True)
    sent_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "system_notice_push_log"
