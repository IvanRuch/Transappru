import hashlib
import httpx
import json
import logging
from typing import Any, Dict, List, Optional, Union
from app.config.settings import settings

logger = logging.getLogger(__name__)

class KaznaService:
    def __init__(self):
        self.base_url = settings.KAZNA_API_URL
        self.secret_key = settings.KAZNA_SECRET_KEY
        self.token = settings.KAZNA_TOKEN
        self.headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {self.token}"
        }
        self._verify_algorithm()

    def _verify_algorithm(self):
        test_str = "card118810177170712879661" + "SA9QXHKV"
        calc_hash = hashlib.md5(test_str.encode('utf-8')).hexdigest()
        
        if calc_hash == "d94c3157500e45ffa87261c05c64d258":
            logger.info("Kazna signature algorithm verification: PASSED")
            print("Kazna signature algorithm verification: PASSED")
        else:
            logger.error(f"Kazna signature algorithm verification: FAILED. Expected d94c3157500e45ffa87261c05c64d258, got {calc_hash}")
            print(f"Kazna signature algorithm verification: FAILED. Expected d94c3157500e45ffa87261c05c64d258, got {calc_hash}")

    def _calculate_sign(self, params: Dict[str, Any], sign_fields: List[str]) -> str:
        sign_str = ""
        
        for field in sign_fields:
            if "." in field:
                parts = field.split(".")
                value = params
                for part in parts:
                    value = value.get(part) if isinstance(value, dict) else None
            else:
                value = params.get(field)

            if value is None:
                continue
                
            if isinstance(value, bool):
                sign_str += "1" if value else "0"
            elif isinstance(value, (dict, list)):
                sign_str += self._collect_values(value)
            else:
                sign_str += str(value)
        
        logger.info(f"Sign string base: {sign_str}")
        print(f"Sign string base: {sign_str}")
        
        sign_str += self.secret_key
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest()

    def _collect_values(self, obj: Union[Dict, List, Any]) -> str:
        result = ""
        if isinstance(obj, dict):
            for key in obj: 
                result += self._collect_values(obj[key])
        elif isinstance(obj, list):
            for item in obj:
                result += self._collect_values(item)
        else:
            result += str(obj)
        return result

    async def init_payment(self, 
                           order_id: str, 
                           amount_cents: int, 
                           payer_params: Dict, 
                           payment_params: Dict,
                           return_url: str,
                           total_sum_cents: Optional[int] = None,
                           dep_type: str = "gibdd",
                           pay_type: str = "card",
                           kvit: bool = True) -> Dict[str, Any]:
        """
        Инициация платежа (метод pay).
        """
        payload = {
            "orderID": order_id,
            "depType": dep_type,
            "payType": pay_type,
            "kvit": kvit,
            # "amount": amount_cents, # Убираем amount
            "payerParams": payer_params,
            "paymentParams": payment_params,
            "returnUrl": return_url,
            "returnSuccessUrl": return_url.replace("/result", "/success"),
            "returnFailUrl": return_url.replace("/result", "/fail"),
        }
        
        # Убрали totalSum
        # if total_sum_cents:
        #     payload["totalSum"] = total_sum_cents

        # Порядок: payType + kvit + supplierBillID
        sign_fields = ["payType", "kvit", "paymentParams.supplierBillID"]

        payload["sign"] = self._calculate_sign(payload, sign_fields)
        
        logger.info(f"Kazna Request Payload: {json.dumps(payload, ensure_ascii=False)}")
        print(f"Kazna Request Payload: {json.dumps(payload, ensure_ascii=False)}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/pay", json=payload, headers=self.headers)
            
            # Логируем сырой ответ
            logger.info(f"Kazna Raw Response: {response.status_code} - {response.text}")
            print(f"Kazna Raw Response: {response.status_code} - {response.text}")
            
            try:
                return response.json()
            except json.JSONDecodeError:
                logger.error(f"Failed to decode Kazna response: {response.text}")
                # Возвращаем ошибку в формате, который поймет контроллер
                return {"error": {"code": response.status_code, "message": f"Invalid JSON from Kazna: {response.text}"}}

    async def get_payment_info(self, payment_id: Union[int, str]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/paymentInfo/{payment_id}", 
                headers=self.headers
            )
            # response.raise_for_status() # Убираем, чтобы не падать, а логировать
            return response.json()

    def verify_notification_sign(self, payment_id: int, status_name: str, sign: str) -> bool:
        raw_str = f"{self.token}{payment_id}{status_name}"
        calculated_sign = hashlib.md5(raw_str.encode('utf-8')).hexdigest()
        return calculated_sign == sign

kazna_service = KaznaService()
