"""
Pydantic request/response schemas for data-issues + system-notice endpoints.

Wire format is intentionally minimal — `user_id` is trusted from the body
(no auth at the payment-service boundary, see ADR-011), `fcm_token` is
optional and only present when the client has been granted push permission.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models import DATA_CATEGORIES

# Pydantic Literal-from-tuple keeps a single source of truth with the
# Tortoise model's CHECK constraint.
DataCategory = Literal[
    "passes",
    "diagnostic_card",
    "fines",
    "osago",
    "rnis",
    "avtodor",
]

assert set(DataCategory.__args__) == set(DATA_CATEGORIES), (
    "DataCategory Literal drifted from DATA_CATEGORIES tuple in models.py — "
    "keep them in sync."
)


class ReportDataIssueRequest(BaseModel):
    user_id: int = Field(..., ge=1, description="legacy user.id (trusted from client)")
    auto_id: int = Field(..., ge=1, description="legacy user_auto.id")
    category: DataCategory
    comment: str | None = Field(default=None, max_length=2000)
    fcm_token: str | None = Field(default=None, max_length=512)
    platform: Literal["mobile_ios", "mobile_android", "web"] | None = None


class ReportDataIssueResponse(BaseModel):
    id: int
    notice_triggered: bool = Field(
        ...,
        description=(
            "True if this complaint pushed the per-category threshold and a "
            "fresh source='auto' system_notice was created as a side effect."
        ),
    )


class SystemNoticeItem(BaseModel):
    """One active banner, as seen by clients via GET /system-notice."""

    category: DataCategory
    message: str
    source: Literal["admin", "auto"]
    since: datetime = Field(
        ..., description="When the notice was activated (created_at)."
    )


class SystemNoticeListResponse(BaseModel):
    notices: list[SystemNoticeItem]
