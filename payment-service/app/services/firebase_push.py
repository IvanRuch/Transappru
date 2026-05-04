"""
Firebase Admin SDK wrapper for server-side FCM recovery push.

Init is lazy and tolerates missing credentials: if the service account
JSON is absent at the configured path, the module logs ERROR once and
sets `is_available()` to False. The data-issues HTTP endpoints continue
to work normally; only the recovery-push fan-out (called from
/banner_off) is silently skipped, which is the desired graceful-degrade
behaviour — banners can still be activated and deactivated, just without
proactively notifying the complainants.

Categories are mapped to short Russian labels via PROVIDER_LABELS so
the recovery push body reads naturally ("По категории штрафы ГИБДД ...").
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Russian labels for the six data categories — must stay in sync with
# the frontend `src/constants/providerLabels.ts`.
PROVIDER_LABELS: dict[str, str] = {
    "passes": "пропуска",
    "diagnostic_card": "диагностическая карта",
    "fines": "штрафы ГИБДД",
    "osago": "ОСАГО",
    "rnis": "РНИС",
    "avtodor": "платные дороги",
}

# Default recovery push body. Overridable per-incident via
# /banner_off <category> "<custom text>".
DEFAULT_RECOVERY_TITLE = "Данные восстановлены"
DEFAULT_RECOVERY_BODY_TPL = (
    "По категории «{label}» данные снова актуальны. Рекомендуем перепроверить."
)

# Notification data payload key — frontend handler keys off this to
# decide whether to show a confirmation toast / deep-link.
NOTIFICATION_TYPE = "data_recovery"


@dataclass
class PushResult:
    success_count: int
    failure_count: int
    # (token, error_code) tuples for the failures — written to
    # system_notice_push_log by the caller.
    failures: list[tuple[str, str]]


class _FirebaseState:
    """Module-level singleton of the firebase_admin App instance."""

    initialized: bool = False
    available: bool = False
    app: object = None  # firebase_admin.App


_state = _FirebaseState()


def _try_init() -> None:
    """Initialise firebase_admin once. Idempotent."""
    if _state.initialized:
        return
    _state.initialized = True
    path = settings.FIREBASE_CREDENTIALS_PATH
    if not path or not os.path.isfile(path):
        logger.error(
            "firebase_push.init.failure: credentials not found at path=%s — "
            "recovery push will be silently skipped (graceful degrade).",
            path,
        )
        return
    try:
        # Imported lazily so tests / tooling that never call recovery
        # push do not need firebase_admin installed.
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(path)
        _state.app = firebase_admin.initialize_app(cred)
        _state.available = True
        logger.info("firebase_push.init.success: credentials_path=%s", path)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "firebase_push.init.failure: path=%s error=%s — recovery push "
            "will be silently skipped (graceful degrade).",
            path,
            exc,
        )


def is_available() -> bool:
    """Whether server-side FCM is wired and ready to send."""
    _try_init()
    return _state.available


def build_recovery_message(
    category: str, custom_body: str | None = None
) -> tuple[str, str]:
    """Compose (title, body) for the recovery push for a given category."""
    label = PROVIDER_LABELS.get(category, category)
    body = custom_body if custom_body else DEFAULT_RECOVERY_BODY_TPL.format(label=label)
    return DEFAULT_RECOVERY_TITLE, body


def send_recovery_push(
    tokens: list[str], category: str, custom_body: str | None = None
) -> PushResult:
    """Fan out recovery notifications to a deduplicated list of FCM tokens.

    Returns an aggregate of per-token success/failure outcomes. Caller is
    responsible for logging individual results into `system_notice_push_log`.

    When FCM is unavailable (no credentials, init failure, or zero tokens
    passed in), returns an empty PushResult — that's the documented
    graceful-degrade contract.
    """
    if not tokens:
        return PushResult(success_count=0, failure_count=0, failures=[])
    if not is_available():
        return PushResult(
            success_count=0,
            failure_count=len(tokens),
            failures=[(t, "fcm_unavailable") for t in tokens],
        )

    title, body = build_recovery_message(category, custom_body)
    try:
        from firebase_admin import messaging
    except ImportError:
        logger.error("firebase_push.send: firebase_admin not installed at runtime")
        return PushResult(
            success_count=0,
            failure_count=len(tokens),
            failures=[(t, "fcm_unavailable") for t in tokens],
        )

    notification = messaging.Notification(title=title, body=body)
    data = {"type": NOTIFICATION_TYPE, "category": category}

    # send_each_for_multicast is the modern replacement for the
    # deprecated send_multicast — same fan-out, returns BatchResponse.
    message = messaging.MulticastMessage(
        notification=notification,
        data=data,
        tokens=tokens,
    )
    try:
        batch = messaging.send_each_for_multicast(message, app=_state.app)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "firebase_push.send.batch_failure: count=%d error=%s",
            len(tokens),
            exc,
        )
        return PushResult(
            success_count=0,
            failure_count=len(tokens),
            failures=[(t, "send_exception") for t in tokens],
        )

    failures: list[tuple[str, str]] = []
    for token, resp in zip(tokens, batch.responses, strict=True):
        if resp.success:
            continue
        # FirebaseError.code: e.g. 'unregistered', 'invalid-argument',
        # 'sender-id-mismatch'. Caller can use these for housekeeping
        # (tombstoning dead tokens, etc.) once we wire it up.
        err = getattr(resp.exception, "code", None) or "unknown"
        failures.append((token, str(err)))

    logger.info(
        "fcm.push.sent notice_category=%s recipients=%d success=%d failure=%d",
        category,
        len(tokens),
        batch.success_count,
        batch.failure_count,
    )
    return PushResult(
        success_count=batch.success_count,
        failure_count=batch.failure_count,
        failures=failures,
    )
