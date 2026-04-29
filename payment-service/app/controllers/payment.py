import logging
import uuid
from typing import Any, Dict, List, Optional

from litestar import Controller, get, post
from litestar.connection import Request
from litestar.exceptions import HTTPException, NotAuthorizedException, NotFoundException
from pydantic import BaseModel

from app.config.settings import settings
from app.models import PaymentTransaction, PaymentTransactionItem
from app.services.commission import commission_service
from app.services.kazna import kazna_service

# Настройка логгера
logger = logging.getLogger(__name__)

# Словарь ошибок для пользователя
ERROR_MESSAGES = {
    "Неверный формат параметра fio": "Пожалуйста, укажите Фамилию, Имя и Отчество (не более 3-4 слов). Используйте только кириллицу.",
    "Неверный формат параметра email": "Пожалуйста, укажите корректный E-mail.",
    "Неверный формат параметра phone": "Пожалуйста, укажите корректный номер телефона.",
    "Сумма платежа меньше минимальной": "Сумма платежа слишком мала.",
    "Начисление с УИН .* не найдено": "Начисление не найдено (возможно, оно уже оплачено или УИН некорректен).",
}

def get_user_friendly_error(kazna_message: str) -> str:
    """Возвращает понятное сообщение об ошибке или оригинал, если перевода нет."""
    if "не найдено" in kazna_message and "УИН" in kazna_message:
        return ERROR_MESSAGES["Начисление с УИН .* не найдено"]

    return ERROR_MESSAGES.get(kazna_message, kazna_message)

# DTOs
class InitPaymentRequest(BaseModel):
    token: str
    uin: str
    amount: float # Сумма в рублях
    depType: str = "gibdd"
    description: Optional[str] = None
    fio: Optional[str] = None
    email: Optional[str] = None
    kvit: bool = False

class InitMultiPaymentRequest(BaseModel):
    token: str
    uins: List[str]
    amount: float
    depType: str = "gibdd"
    fio: Optional[str] = None
    email: Optional[str] = None
    kvit: bool = False

class PaymentInitiateResponse(BaseModel):
    payment_url: str
    payment_id: str
    total_amount: float

class CalculateCommissionRequest(BaseModel):
    amount: float
    depType: str = "gibdd"

class ChargeItemDTO(BaseModel):
    amount: float
    depType: str

class CalculateMultiCommissionRequest(BaseModel):
    charges: List[ChargeItemDTO]

class CommissionDetailItem(BaseModel):
    type: str # gibdd, paidRoads, etc.
    amount: float
    commission: float
    count: int
    kazna_percent: float
    transapp_percent: float

class CommissionResponse(BaseModel):
    amount: float
    kazna_commission: float
    transapp_commission: float
    total_amount: float
    kazna_percent: float
    transapp_percent: float
    details: Optional[List[CommissionDetailItem]] = None # Детализация по типам

class PaymentStatus(BaseModel):
    code: int
    name: str
    date: Optional[str] = None
    cancelReason: Optional[str] = None
    cancelCode: Optional[int] = None

class KaznaNotification(BaseModel):
    paymentID: int
    orderID: str
    status: PaymentStatus
    sign: str

class UpdateRateRequest(BaseModel):
    service_type: str
    kazna_percent: Optional[float] = None
    kazna_min_amount: Optional[int] = None # в копейках
    transapp_percent: Optional[float] = None
    transapp_min_amount: Optional[int] = None # в копейках

class PaymentStatusResponse(BaseModel):
    id: str
    status: str # created, pending, auth, cancel, error
    kazna_payment_id: Optional[str] = None

class PaymentController(Controller):
    path = "/api"

    @get("/payment-status/{payment_id:str}")
    async def get_payment_status(self, payment_id: str) -> PaymentStatusResponse:
        transaction = await PaymentTransaction.filter(id=payment_id).first()
        if not transaction:
            raise NotFoundException("Payment not found")

        if transaction.kazna_status in ["auth", "cancel", "refunded"]:
            return PaymentStatusResponse(
                id=str(transaction.id),
                status=transaction.kazna_status,
                kazna_payment_id=transaction.kazna_payment_id
            )

        if transaction.kazna_payment_id:
            try:
                kazna_info = await kazna_service.get_payment_info(transaction.kazna_payment_id)

                if "status" in kazna_info:
                    new_status = kazna_info["status"]["name"]
                    if new_status != transaction.kazna_status:
                        transaction.kazna_status = new_status
                        await transaction.save()
            except Exception as e:
                logger.error(f"Error updating payment status for {payment_id}: {e}")

        return PaymentStatusResponse(
            id=str(transaction.id),
            status=transaction.kazna_status,
            kazna_payment_id=transaction.kazna_payment_id
        )

    @post("/admin/update-rate")
    async def update_rate(self, data: UpdateRateRequest, request: Request) -> Dict[str, str]:
        admin_token = request.headers.get("X-Admin-Token")
        if not admin_token or admin_token != settings.SECRET_KEY:
            raise NotAuthorizedException("Invalid admin token")

        await commission_service.update_rate(
            service_type=data.service_type,
            kazna_percent=data.kazna_percent,
            kazna_min=data.kazna_min_amount,
            transapp_percent=data.transapp_percent,
            transapp_min=data.transapp_min_amount
        )

        return {"status": "ok", "message": f"Rate for {data.service_type} updated"}

    @post("/calculate-commission")
    async def calculate_commission(self, data: CalculateCommissionRequest) -> CommissionResponse:
        amount_cents = int(data.amount * 100)

        details = await commission_service.get_commission_details(amount_cents, data.depType)

        return CommissionResponse(
            amount=data.amount,
            kazna_commission=details["kazna"] / 100.0,
            transapp_commission=details["transapp"] / 100.0,
            total_amount=details["total"] / 100.0,
            kazna_percent=details["kazna_percent"],
            transapp_percent=details["transapp_percent"]
        )

    @post("/calculate-multi-commission")
    async def calculate_multi_commission(self, data: CalculateMultiCommissionRequest) -> CommissionResponse:
        total_amount_cents = 0
        total_kazna_commission = 0
        total_transapp_commission = 0

        first_kazna_percent = 0.0
        first_transapp_percent = 0.0

        grouped_details: Dict[str, Dict[str, Any]] = {}

        for i, charge in enumerate(data.charges):
            amount_cents = int(charge.amount * 100)
            details = await commission_service.get_commission_details(amount_cents, charge.depType)

            total_amount_cents += amount_cents
            total_kazna_commission += details["kazna"]
            total_transapp_commission += details["transapp"]

            if i == 0:
                first_kazna_percent = details["kazna_percent"]
                first_transapp_percent = details["transapp_percent"]

            if charge.depType not in grouped_details:
                grouped_details[charge.depType] = {
                    "amount": 0,
                    "commission": 0,
                    "count": 0,
                    "kazna_percent": details["kazna_percent"],
                    "transapp_percent": details["transapp_percent"]
                }

            grouped_details[charge.depType]["amount"] += amount_cents
            grouped_details[charge.depType]["commission"] += (details["kazna"] + details["transapp"])
            grouped_details[charge.depType]["count"] += 1

        details_list = []
        for dep_type, info in grouped_details.items():
            details_list.append(CommissionDetailItem(
                type=dep_type,
                amount=info["amount"] / 100.0,
                commission=info["commission"] / 100.0,
                count=info["count"],
                kazna_percent=info["kazna_percent"],
                transapp_percent=info["transapp_percent"]
            ))

        return CommissionResponse(
            amount=total_amount_cents / 100.0,
            kazna_commission=total_kazna_commission / 100.0,
            transapp_commission=total_transapp_commission / 100.0,
            total_amount=(total_amount_cents + total_kazna_commission + total_transapp_commission) / 100.0,
            kazna_percent=first_kazna_percent,
            transapp_percent=first_transapp_percent,
            details=details_list
        )

    @post("/init-payment")
    async def init_payment(self, data: InitPaymentRequest) -> PaymentInitiateResponse:
        amount_cents = int(data.amount * 100)
        total_sum_cents = await commission_service.calculate_total_sum(amount_cents, data.depType)
        order_id = str(uuid.uuid4())

        payer_params = {
            "fio": data.fio or "Пользователь TransApp",
        }

        if data.email:
            payer_params["email"] = data.email

        # ВРЕМЕННЫЙ ХАК ДЛЯ ТЕСТА
        target_uin = data.uin
        if "demopay" in settings.KAZNA_API_URL:
             target_uin = "18810177170712879661"
             logger.warning(f"TEST MODE: Replacing real UIN {data.uin} with test UIN {target_uin}")

        payment_params = {
            "supplierBillID": target_uin,
        }

        transaction = await PaymentTransaction.create(
            id=order_id,
            amount=data.amount,
            description=data.description,
            uin=data.uin,
            uin_count=1,
            kazna_status="created"
        )

        # Создаем запись для отслеживания статуса УИН
        await PaymentTransactionItem.create(
            transaction=transaction,
            uin=data.uin,
            amount=data.amount,
            status="pending"
        )

        try:
            kazna_response = await kazna_service.init_payment(
                order_id=order_id,
                amount_cents=amount_cents,
                payer_params=payer_params,
                payment_params=payment_params,
                return_url="https://transapp.ru/payment/result",
                total_sum_cents=total_sum_cents,
                dep_type=data.depType,
                kvit=data.kvit
            )

            logger.info(f"Kazna API response for {order_id}: {kazna_response}")
            print(f"Kazna API response for {order_id}: {kazna_response}")

            if "redirectUrl" in kazna_response:
                transaction.kazna_payment_id = str(kazna_response.get("paymentID"))
                transaction.kazna_status = "pending"
                await transaction.save()

                return PaymentInitiateResponse(
                    payment_url=kazna_response["redirectUrl"],
                    payment_id=str(transaction.id),
                    total_amount=total_sum_cents / 100.0
                )
            else:
                raw_error_msg = "Ошибка платежной системы"
                if "message" in kazna_response:
                     raw_error_msg = kazna_response["message"]
                elif "error" in kazna_response:
                    error_data = kazna_response["error"]
                    raw_error_msg = error_data.get('message', 'Unknown error')

                user_error_msg = get_user_friendly_error(raw_error_msg)

                transaction.kazna_status = "error"
                await transaction.save()
                logger.error(f"Kazna API Error: {raw_error_msg}")

                raise HTTPException(status_code=400, detail=user_error_msg)

        except HTTPException as e:
            raise e
        except Exception:
            logger.exception(f"Error processing payment {order_id}")
            transaction.kazna_status = "failed"
            await transaction.save()
            raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера. Попробуйте позже.")

    @post("/init-multi-payment")
    async def init_multi_payment(self, data: InitMultiPaymentRequest) -> PaymentInitiateResponse:
        logger.info(f"Init multi payment request: {data}")
        print(f"Init multi payment request: {data}")

        amount_cents = int(data.amount * 100)
        total_sum_cents = await commission_service.calculate_total_sum(amount_cents, data.depType)
        order_id = str(uuid.uuid4())

        payer_params = {
            "fio": data.fio or "Пользователь TransApp",
        }

        if data.email:
            payer_params["email"] = data.email

        # ВРЕМЕННЫЙ ХАК ДЛЯ ТЕСТА МУЛЬТИОПЛАТЫ
        target_uins = data.uins
        if "demopay" in settings.KAZNA_API_URL:
             target_uins = ["18810177170712879661"]
             logger.warning(f"TEST MODE: Replacing real UINs {data.uins} with test UIN {target_uins}")

        payment_params = {
            "supplierBillID": target_uins
        }

        # Сохраняем полный список УИНов, так как теперь поле TextField
        uin_str = ",".join(data.uins)

        transaction = await PaymentTransaction.create(
            id=order_id,
            amount=data.amount,
            description=f"Оплата {len(data.uins)} штрафов",
            uin=uin_str,
            uin_count=len(data.uins),
            kazna_status="created"
        )

        # Создаем записи для каждого УИН для отслеживания статуса
        # Предполагаем равномерное распределение суммы (можно улучшить, передавая суммы отдельно)
        amount_per_uin = data.amount / len(data.uins) if data.uins else 0
        for uin in data.uins:
            await PaymentTransactionItem.create(
                transaction=transaction,
                uin=uin,
                amount=amount_per_uin,
                status="pending"
            )

        try:
            kazna_response = await kazna_service.init_payment(
                order_id=order_id,
                amount_cents=amount_cents,
                payer_params=payer_params,
                payment_params=payment_params,
                return_url="https://transapp.ru/payment/result",
                total_sum_cents=total_sum_cents,
                dep_type=data.depType,
                kvit=data.kvit
            )

            logger.info(f"Kazna API response for {order_id}: {kazna_response}")
            print(f"Kazna API response for {order_id}: {kazna_response}")

            if "redirectUrl" in kazna_response:
                transaction.kazna_payment_id = str(kazna_response.get("paymentID"))
                transaction.kazna_status = "pending"
                await transaction.save()

                return PaymentInitiateResponse(
                    payment_url=kazna_response["redirectUrl"],
                    payment_id=str(transaction.id),
                    total_amount=total_sum_cents / 100.0
                )
            else:
                raw_error_msg = "Ошибка платежной системы"
                if "message" in kazna_response:
                     raw_error_msg = kazna_response["message"]
                elif "error" in kazna_response:
                    error_data = kazna_response["error"]
                    raw_error_msg = error_data.get('message', 'Unknown error')

                user_error_msg = get_user_friendly_error(raw_error_msg)

                transaction.kazna_status = "error"
                await transaction.save()
                logger.error(f"Kazna API Error: {raw_error_msg}")
                raise HTTPException(status_code=400, detail=user_error_msg)

        except HTTPException as e:
            raise e
        except Exception:
            logger.exception(f"Error processing payment {order_id}")
            transaction.kazna_status = "failed"
            await transaction.save()
            raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера. Попробуйте позже.")

    @post("/notify")
    async def notify(self, data: KaznaNotification) -> Dict[str, str]:
        is_valid = kazna_service.verify_notification_sign(
            payment_id=data.paymentID,
            status_name=data.status.name,
            sign=data.sign
        )

        if not is_valid:
            return {"status": "error", "message": "Invalid signature"}

        transaction = await PaymentTransaction.filter(id=data.orderID).first()

        if not transaction:
            return {"status": "ok"}

        transaction.kazna_status = data.status.name
        if not transaction.kazna_payment_id:
            transaction.kazna_payment_id = str(data.paymentID)

        await transaction.save()

        # Обновляем статус всех УИНов в транзакции
        items = await PaymentTransactionItem.filter(transaction=transaction).all()

        if data.status.name == "paid":
            # Если платеж успешен - помечаем все УИНы как оплаченные
            for item in items:
                item.status = "paid"
                item.paid_at = data.status.date
                await item.save()
            logger.info(f"Marked {len(items)} UINs as paid for transaction {transaction.id}")
        elif data.status.name in ["cancelled", "failed"]:
            # Если платеж отменен или провален
            for item in items:
                item.status = data.status.name
                await item.save()
            logger.info(f"Marked {len(items)} UINs as {data.status.name} for transaction {transaction.id}")

        return {"status": "ok"}
