from typing import Optional, Dict
from app.models import CommissionRate
import time
from datetime import datetime

class CommissionService:
    def __init__(self):
        self._cache: Dict[str, CommissionRate] = {}
        self._cache_time = 0
        self._cache_ttl = 300 # 5 минут

    async def _get_rate(self, service_type: str) -> CommissionRate:
        """
        Получает актуальный тариф из кэша или БД.
        """
        now = time.time()
        if not self._cache or (now - self._cache_time > self._cache_ttl):
            await self._refresh_cache()

        return self._cache.get(service_type) or self._cache.get("default")

    async def _refresh_cache(self):
        rates = await CommissionRate.filter(valid_to__isnull=True).all()
        self._cache = {rate.service_type: rate for rate in rates}
        self._cache_time = time.time()

        if not self._cache:
            await self._seed_defaults()
            rates = await CommissionRate.filter(valid_to__isnull=True).all()
            self._cache = {rate.service_type: rate for rate in rates}

    async def _seed_defaults(self):
        await CommissionRate.create(
            service_type="default",
            kazna_percent=2.0,
            kazna_min_amount=1500,
            transapp_percent=0.1,
            transapp_min_amount=1
        )
        await CommissionRate.create(
            service_type="paidRoads",
            kazna_percent=3.0,
            kazna_min_amount=2000,
            transapp_percent=0.1,
            transapp_min_amount=1
        )

    async def update_rate(self,
                          service_type: str,
                          kazna_percent: Optional[float] = None,
                          kazna_min: Optional[int] = None,
                          transapp_percent: Optional[float] = None,
                          transapp_min: Optional[int] = None):
        now = datetime.utcnow()

        current_rate = await CommissionRate.filter(service_type=service_type, valid_to__isnull=True).first()

        new_kazna_percent = 2.0
        new_kazna_min = 1500
        new_transapp_percent = 0.1
        new_transapp_min = 1

        if current_rate:
            new_kazna_percent = float(current_rate.kazna_percent) if kazna_percent is None else kazna_percent
            new_kazna_min = current_rate.kazna_min_amount if kazna_min is None else kazna_min
            new_transapp_percent = float(current_rate.transapp_percent) if transapp_percent is None else transapp_percent
            new_transapp_min = current_rate.transapp_min_amount if transapp_min is None else transapp_min

            current_rate.valid_to = now
            await current_rate.save()
        else:
            if kazna_percent is not None: new_kazna_percent = kazna_percent
            if kazna_min is not None: new_kazna_min = kazna_min
            if transapp_percent is not None: new_transapp_percent = transapp_percent
            if transapp_min is not None: new_transapp_min = transapp_min

        await CommissionRate.create(
            service_type=service_type,
            kazna_percent=new_kazna_percent,
            kazna_min_amount=new_kazna_min,
            transapp_percent=new_transapp_percent,
            transapp_min_amount=new_transapp_min,
            valid_from=now
        )

        self._cache = {}

    async def calculate_total_sum(self, amount_cents: int, dep_type: str) -> int:
        if amount_cents <= 0:
            return 0

        rate = await self._get_rate(dep_type)
        
        if not rate:
            return int(amount_cents * 1.021)

        kazna_commission = int(amount_cents * (float(rate.kazna_percent) / 100))
        kazna_commission = max(kazna_commission, rate.kazna_min_amount)
        
        transapp_commission = int(amount_cents * (float(rate.transapp_percent) / 100))
        transapp_commission = max(transapp_commission, rate.transapp_min_amount)

        total = amount_cents + kazna_commission + transapp_commission
        
        return total

    async def get_commission_details(self, amount_cents: int, dep_type: str) -> dict:
        """
        Возвращает детализацию комиссии, включая проценты.
        """
        if amount_cents <= 0:
            return {
                "kazna": 0, "transapp": 0, "total": 0,
                "kazna_percent": 0, "transapp_percent": 0
            }

        rate = await self._get_rate(dep_type)
        if not rate:
             return {
                 "kazna": 0, "transapp": 0, "total": amount_cents,
                 "kazna_percent": 0, "transapp_percent": 0
             }

        kazna_commission = int(amount_cents * (float(rate.kazna_percent) / 100))
        kazna_commission = max(kazna_commission, rate.kazna_min_amount)

        transapp_commission = int(amount_cents * (float(rate.transapp_percent) / 100))
        transapp_commission = max(transapp_commission, rate.transapp_min_amount)

        return {
            "kazna": kazna_commission,
            "transapp": transapp_commission,
            "total": amount_cents + kazna_commission + transapp_commission,
            "kazna_percent": float(rate.kazna_percent),
            "transapp_percent": float(rate.transapp_percent)
        }

commission_service = CommissionService()
