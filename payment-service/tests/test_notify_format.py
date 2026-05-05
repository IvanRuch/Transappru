"""
Tests for `app/bot/notify.py:format_admin_alert` — verifies that
user-supplied `comment` fields are Markdown-V1-escaped so unbalanced
`_`/`*`/`[`/`` ` `` characters don't break Telegram entity parsing
on the wire.

Background: a real-world `/help` reply crashed the bot dispatcher
with `Bad Request: can't parse entities: Can't find end of the entity
starting at byte offset 412` because `diagnostic_card` (a category
machine name) was rendered as plain text → Telegram parsed `_` as the
italic delimiter. Same surface area applies to user `comment`s.
"""

from __future__ import annotations

from app.bot import notify


class TestEscapeMdV1:
    def test_escapes_underscore(self) -> None:
        assert notify._escape_md_v1("foo_bar") == "foo\\_bar"

    def test_escapes_asterisk(self) -> None:
        assert notify._escape_md_v1("a*b") == "a\\*b"

    def test_escapes_backtick(self) -> None:
        assert notify._escape_md_v1("hello`world") == "hello\\`world"

    def test_escapes_open_bracket(self) -> None:
        assert notify._escape_md_v1("see [docs]") == "see \\[docs]"

    def test_escapes_existing_backslash_first(self) -> None:
        # `\\_` must become `\\\\\\_` (the original `\\` doubles, then
        # the `_` gets its own backslash). Order matters in the helper.
        assert notify._escape_md_v1("\\_") == "\\\\\\_"

    def test_no_op_on_clean_text(self) -> None:
        assert notify._escape_md_v1("Привет мир") == "Привет мир"


class TestFormatAdminAlert:
    def test_escapes_user_comment(self) -> None:
        text = notify.format_admin_alert(
            issue_id=42,
            user_id=1,
            auto_id=1,
            category="fines",
            comment="штраф_не пришёл *должен быть*",
            auto_notice_triggered=False,
            auto_notice_id=None,
        )
        # Underscore in the comment must be escaped; asterisks too.
        assert "штраф\\_не пришёл \\*должен быть\\*" in text
        # The static `*Жалоба на данные*` formatting is preserved.
        assert "*Жалоба на данные*" in text

    def test_renders_when_comment_is_none(self) -> None:
        text = notify.format_admin_alert(
            issue_id=1,
            user_id=1,
            auto_id=1,
            category="osago",
            comment=None,
            auto_notice_triggered=False,
            auto_notice_id=None,
        )
        assert "Комментарий" not in text

    def test_truncates_long_comment(self) -> None:
        long_comment = "x" * 1500
        text = notify.format_admin_alert(
            issue_id=1,
            user_id=1,
            auto_id=1,
            category="passes",
            comment=long_comment,
            auto_notice_triggered=False,
            auto_notice_id=None,
        )
        # Truncation kicks in at 1000; ellipsis added.
        assert "x" * 1001 not in text
        assert "…" in text

    def test_includes_auto_banner_marker(self) -> None:
        text = notify.format_admin_alert(
            issue_id=3,
            user_id=99,
            auto_id=99,
            category="fines",
            comment=None,
            auto_notice_triggered=True,
            auto_notice_id=7,
        )
        assert "Авто-баннер активирован" in text
        assert "notice #7" in text
