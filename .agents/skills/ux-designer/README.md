# UX Designer Skill

A Claude Code skill that provides comprehensive UX/UI design guidance based on modern best practices (2026).

## What It Does

Gives Claude deep knowledge of user experience design principles so it can:

- Design new interfaces and components with proper patterns
- Review existing UI/UX and frontend code for issues
- Apply WCAG 2.2 AA accessibility standards
- Guide interaction design, form design, and navigation
- Advise on mobile-first and responsive approaches
- Write effective UI copy and microcopy
- Design collaborative/multiplayer and canvas-based apps
- Build AI-powered interfaces (chat, copilots, agents)
- Evaluate designs for dark patterns and ethical compliance

## Installation

Copy or symlink the `ux-designer-skill/` directory into your Claude Code skills location:

```
~/.claude/skills/ux-designer/
```

The skill is invocable by both user (`/ux-designer`) and Claude (auto-triggered when UX topics arise).

## Structure

```
ux-designer/
├── SKILL.md                              # Main skill definition (297 lines)
└── references/                           # 24 detailed reference files (~10,700 lines)
    ├── 01-core-principles.md             # Nielsen heuristics, Gestalt, UX hierarchy
    ├── 02-laws-of-ux.md                  # Fitts's, Hick's, Miller's, Jakob's, etc.
    ├── 03-accessibility.md               # WCAG 2.2 AA compliance
    ├── 04-visual-design.md               # Typography, color, spacing, hierarchy
    ├── 05-information-architecture.md    # Navigation, sitemaps, card sorting
    ├── 06-interaction-design.md          # Modals, tooltips, drag-and-drop
    ├── 07-forms-and-inputs.md            # Validation, field types, error handling
    ├── 08-mobile-ux.md                   # Touch targets, gestures, responsive
    ├── 09-ux-writing.md                  # Microcopy, tone, error messages
    ├── 10-user-research.md               # Interviews, usability testing, surveys
    ├── 11-design-systems.md              # Tokens, components, documentation
    ├── 12a-presence-awareness.md         # Live cursors, avatars, typing indicators
    ├── 12b-conflict-resolution-sync.md   # OT/CRDTs, locking, offline sync
    ├── 13a-canvas-navigation.md          # Zoom, pan, selection, manipulation
    ├── 13b-canvas-objects-performance.md  # Layers, snapping, LOD, culling
    ├── 14-ai-ux-patterns.md              # Chat UI, copilots, agents, generative UI
    ├── 15-ethical-design.md              # Dark patterns, consent, GDPR/DSA
    ├── 16-onboarding.md                  # First-run, activation, empty states
    ├── 17-notifications.md               # Toasts, badges, push, attention management
    ├── 18-data-visualization.md          # Charts, dashboards, KPIs
    ├── 19-search-ux.md                   # Autocomplete, filters, results ranking
    ├── 20-emotional-design.md            # Trust, delight, brand personality
    ├── 21-data-tables.md                 # Sorting, pagination, bulk actions, inline edit
    └── 22-performance-ux.md              # Skeletons, optimistic updates, CLS, lazy loading
```

## SKILL.md Highlights

The main file (always loaded into context) includes:

- **Quick reference checklists** for visual design, interaction, forms, navigation, accessibility, collaboration, canvas, AI, onboarding, notifications, and ethical design
- **Decision trees** for choosing between modal/side panel/full page and notification types
- **Key numbers** grouped by category (layout, interaction, collaboration, AI, engagement)
- **23 anti-patterns** with links to the reference file that shows the correct approach

Reference files are loaded on demand when the topic is relevant, keeping context usage efficient.

## Coverage Areas

| Domain | References |
|--------|-----------|
| Foundations | Core principles, Laws of UX, accessibility, visual design |
| Structure | Information architecture, interaction design, forms |
| Platform | Mobile UX, design systems |
| Content | UX writing, user research |
| Collaboration | Presence/awareness, conflict resolution/sync |
| Canvas/Spatial | Navigation/interaction, objects/performance |
| Modern | AI interfaces, ethical design, emotional design |
| Flows | Onboarding, notifications, search |
| Data | Data visualization, data tables, performance/loading |

## Sources

The skill synthesizes guidance from 19 authoritative sources including Nielsen Norman Group, WCAG 2.2, Material Design, Apple HIG, Laws of UX, Google PAIR, Microsoft HAX Toolkit, Baymard Institute, The A11y Project, and web.dev.
