-- Migration: Add data_issues + system_notice + system_notice_push_log
-- Created: 2026-05-04
-- Description: Backend for data-issues reporting + system-notice banner.
-- See .claude/plans/2026-05-04-data-issues-reporting.md and Writerside ADR-011.

-- system_notice MUST be created first because data_issues.notice_id references it.
CREATE TABLE system_notice (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(32) NOT NULL CHECK (category IN
        ('passes', 'diagnostic_card', 'fines', 'osago', 'rnis', 'avtodor')),
    message TEXT NOT NULL,
    source VARCHAR(16) NOT NULL CHECK (source IN ('admin', 'auto')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    push_sent_at TIMESTAMPTZ,
    push_recipient_count INTEGER,
    push_message TEXT
);

-- Two simultaneously active notices per category are not allowed —
-- partial unique index on the open subset enforces this at DB level
-- and lets us rely on `INSERT ... ON CONFLICT DO NOTHING` for the
-- atomic auto-banner create path under contention (see services/data_issues.py).
CREATE UNIQUE INDEX system_notice_active_unique
    ON system_notice (category)
    WHERE deactivated_at IS NULL;

CREATE INDEX system_notice_category_active
    ON system_notice (category, deactivated_at);

CREATE TABLE data_issues (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    auto_id INTEGER NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN
        ('passes', 'diagnostic_card', 'fines', 'osago', 'rnis', 'avtodor')),
    comment TEXT,
    fcm_token VARCHAR(512),
    platform VARCHAR(16),
    source_ip VARCHAR(45),  -- IPv6-max length, kept as VARCHAR for SQLite test parity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    notice_id BIGINT REFERENCES system_notice(id) ON DELETE SET NULL
);

-- Rate-limit at DB level: one open complaint per (user, auto, category).
-- A user re-clicking "report" on the same category before the previous
-- complaint is resolved gets HTTP 409 from the endpoint.
CREATE UNIQUE INDEX data_issues_open_unique
    ON data_issues (user_id, auto_id, category)
    WHERE resolved_at IS NULL;

-- For threshold check: count distinct user_ids per category in last N hours.
CREATE INDEX data_issues_category_created
    ON data_issues (category, created_at DESC);

CREATE INDEX data_issues_notice
    ON data_issues (notice_id);

CREATE TABLE system_notice_push_log (
    id BIGSERIAL PRIMARY KEY,
    notice_id BIGINT NOT NULL REFERENCES system_notice(id) ON DELETE CASCADE,
    fcm_token VARCHAR(512) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('success', 'failure')),
    error_code VARCHAR(64),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX system_notice_push_log_notice
    ON system_notice_push_log (notice_id);

COMMENT ON TABLE data_issues IS 'User-reported data quality complaints by category. user_id is trusted from request body (no legacy auth).';
COMMENT ON TABLE system_notice IS 'Active and historical banners. category UNIQUE WHERE deactivated_at IS NULL.';
COMMENT ON TABLE system_notice_push_log IS 'Per-token result of recovery push fan-out triggered by /banner_off.';
