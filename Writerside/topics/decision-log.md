# Decision Log (ADR)

Architecture Decision Records for TransApp.

## Format

```
### ADR-NNN: Title (YYYY-MM-DD)

**Context:** Why this decision was needed.
**Decision:** What we chose.
**Rationale:** Why this approach over alternatives.
**Consequences:** What changed, trade-offs.
```

---

### ADR-001: Web version via Expo Web, shared codebase (2026-04-13)

**Context:** The legacy web app (`transappweb/`, currently in production) is severely outdated
and no longer acceptable. A new web version is needed now, while the mobile app (`/src/`)
is still in active development.

**Decision:** Build the web version using Expo Web (`npx expo start --web`) from the same
`/src/` codebase as the mobile app. No separate React project.

**Rationale:**
- Single codebase — one set of components, hooks, API layer, types
- `.web.tsx` platform overrides already exist for key screens (AuthScreen, AutoListScreen)
- Expo Router supports web navigation out of the box
- Avoids maintaining two parallel UI codebases
- Alternative (separate React app) rejected: too much duplication, harder to keep parity

**Consequences:**
- Some RN libraries may need web-compatible alternatives or `.web.tsx` shims
- Must verify all used libraries work on web (maps, push notifications, camera, etc.)
- `Platform.select` / `.web.tsx` files needed where native and web UX diverge
- Mobile development is NOT blocked — web-incompatible features can be platform-gated
- Legacy `transappweb/` stays as read-only reference until new web is deployed
