# Project Dashboard

> Last updated: 2026-04-14

## Current Focus

<!-- Update this section after each work session -->

| Area | Status | Notes |
|------|--------|-------|
| Mobile App | 🔄 Active development | v2.0.17, Expo 54 |
| Payment Service | ✅ Deployed | Kazna API integration |
| Web Version | 🔄 Active development | Expo Web, all screens done, CI/CD configured |
| Legacy Web | ⚠️ In production | `/transappweb/` — to be replaced |
| Legacy Mobile | 📦 Archive | `/Transappru/` — reference only |
| Documentation | 🔄 Migration to Writerside | From /docs/ markdown |

## Recent Changes

- **2026-04-14**: CI/CD: Docker deploy pipeline for Web + Payment to Yandex Cloud COI VM — nginx/Dockerfile.prod (multi-stage Expo Web build), payment-service/Dockerfile.prod (gunicorn), docker-compose.yc.yaml, GitHub Actions workflow (deploy-web.yml), SSL via Yandex Certificate Manager, api.web.ts payment URL made dynamic
- **2026-04-14**: Web: all sidebar-linked screens now have `.web.tsx` versions — DriverListScreen (wraps DriversTab), NotificationListScreen (click-to-mark-viewed), NotificationSettingsScreen (two-level toggle tree with optimistic updates), ChargesScreen (grouped fines by auto, filter pills, SHOW_PAYMENT_UI selection+footer), UserScreen (profile: org data, contact CRUD, logout, delete profile). AutoDetailScreen.web.tsx — 8-tab vehicle detail screen, 13 sub-components. Fix: onboarding redirect loop — localStorage+sessionStorage persistence
- **2026-04-13**: Web: logout fix (token removal), first-login flow (onboarding redirect + "Наши услуги" modal from /get-auto-list), anti-loop guards. Phone input cursor fix, OTP-style PIN fields. Unified API client, InnScreen.web.tsx, inline search, sidebar fixes
- **2026-04-09**: Claude Code configuration setup — CLAUDE.md (4 files), 3 PostToolUse hooks, 7 slash commands, 2 custom skills, 46 external skills, 3 MCP servers (PostgreSQL + Playwright + Context7), Writerside structure (16 topics), agnix validation

## Next Tasks

1. ~~Decide web strategy~~ — done, ADR-001: Expo Web
2. Migrate key /docs/ content to Writerside topics
3. Configure and verify MCP servers (start Docker, test PostgreSQL query)
4. Set up test framework for mobile app (Jest/Vitest)

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 2.0.17 | current | ... |
| 2.0.15 | ... | Double listener protection, new payload data |
| 2.0.14 | ... | OSAGO button, web support |
