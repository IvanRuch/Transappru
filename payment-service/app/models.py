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
        return f"Payment {self.id} (Kazna: {self.kazna_payment_id}) - {self.kazna_status}"

class PaymentTransactionItem(models.Model):
    """
    Модель для отслеживания статуса каждого УИН в мультиоплате.
    """
    id = fields.IntField(pk=True)
    transaction = fields.ForeignKeyField('models.PaymentTransaction', related_name='items', on_delete=fields.CASCADE)

    uin = fields.CharField(max_length=50, index=True)
    amount = fields.DecimalField(max_digits=10, decimal_places=2)

    # Статус оплаты конкретного УИН
    status = fields.CharField(max_length=50, default="pending")  # pending, paid, failed, cancelled

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
