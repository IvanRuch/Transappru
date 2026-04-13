# Project Dashboard

> Last updated: 2026-04-13

## Current Focus

<!-- Update this section after each work session -->

| Area | Status | Notes |
|------|--------|-------|
| Mobile App | 🔄 Active development | v2.0.17, Expo 54 |
| Payment Service | ✅ Deployed | Kazna API integration |
| Web Version | 🔄 Starting | Expo Web from `/src/`, ADR-001 |
| Legacy Web | ⚠️ In production | `/transappweb/` — to be replaced |
| Legacy Mobile | 📦 Archive | `/Transappru/` — reference only |
| Documentation | 🔄 Migration to Writerside | From /docs/ markdown |

## Recent Changes

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
