"""
Tests for app/services/firebase_push.py.

We do not exercise the real firebase_admin SDK here — only the
graceful-degrade contract:
  - is_available() returns False when the credentials file is missing
  - send_recovery_push() with empty token list short-circuits
  - send_recovery_push() with tokens but no FCM availability returns
    a PushResult with all entries marked failure(error='fcm_unavailable')

Production sanity checks (real credentials, real FCM) are out of scope
for unit tests — see manual QA in PR-1 description.
"""

from app.services import firebase_push


def _reset_state() -> None:
    """Ensure each test runs against a fresh init state."""
    firebase_push._state.initialized = False
    firebase_push._state.available = False
    firebase_push._state.app = None


class TestGracefulDegrade:
    def test_is_available_false_when_path_missing(self, monkeypatch) -> None:
        _reset_state()
        monkeypatch.setattr(
            firebase_push.settings, "FIREBASE_CREDENTIALS_PATH", "/nonexistent.json"
        )
        assert firebase_push.is_available() is False

    def test_is_available_false_when_path_empty(self, monkeypatch) -> None:
        _reset_state()
        monkeypatch.setattr(firebase_push.settings, "FIREBASE_CREDENTIALS_PATH", "")
        assert firebase_push.is_available() is False

    def test_send_with_empty_tokens_returns_zero(self) -> None:
        _reset_state()
        result = firebase_push.send_recovery_push([], "fines")
        assert result.success_count == 0
        assert result.failure_count == 0
        assert result.failures == []

    def test_send_when_unavailable_returns_failure_per_token(self, monkeypatch) -> None:
        _reset_state()
        monkeypatch.setattr(
            firebase_push.settings, "FIREBASE_CREDENTIALS_PATH", "/missing.json"
        )
        tokens = ["tok-1", "tok-2"]
        result = firebase_push.send_recovery_push(tokens, "fines")
        assert result.success_count == 0
        assert result.failure_count == 2
        assert {t for t, _ in result.failures} == set(tokens)
        assert all(err == "fcm_unavailable" for _, err in result.failures)


class TestMessageBuilder:
    def test_default_body_uses_russian_label(self) -> None:
        title, body = firebase_push.build_recovery_message("fines")
        assert title == "Данные восстановлены"
        assert "штрафы ГИБДД" in body

    def test_custom_body_overrides_default(self) -> None:
        _, body = firebase_push.build_recovery_message(
            "fines", custom_body="Свой текст"
        )
        assert body == "Свой текст"

    def test_unknown_category_falls_back_to_raw_key(self) -> None:
        _, body = firebase_push.build_recovery_message("nonsense")
        assert "nonsense" in body
