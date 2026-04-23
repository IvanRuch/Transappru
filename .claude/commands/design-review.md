---
description: UI/UX design review via Playwright (snapshot-first, screenshot on demand)
argument-hint: [empty | expo-web | web | component:<name> | compare]
---

UI/UX design review via Playwright MCP.

**Context cost warning:** Playwright snapshots are text (cheap); screenshots are images (expensive).
Default to snapshot-only. Take screenshots ONLY for visual issues that cannot be judged from text
(layout, colors, overlap, z-index, actual rendering). One screenshot per page, not per state.

Argument: `$ARGUMENTS`
- empty — review Expo Web at `localhost:8081`
- `expo-web` — same as empty
- `web` — review `transappweb` at `localhost:3000` (legacy reference, usually not needed)
- `component:<name>` — review one component (search `src/components/`)
- `compare` — mobile viewport (375×812) vs desktop (1440×900) — visual comparison, screenshots needed

## Prerequisite

Dev server must be running. If `browser_navigate` fails, warn and stop — do NOT start servers automatically.

## Default flow (text-only, context-cheap)

For each page to review:
1. `browser_navigate` to the URL
2. `browser_snapshot` (text a11y tree) — use this to judge structure, ARIA, hierarchy, content
3. Only if the user asked for visual review OR you see a potential visual issue that can't be confirmed from the tree:
   - `browser_take_screenshot` — one shot, viewport
4. `browser_close` when done (frees the session)

## Review checklist

### Accessibility (from snapshot)

- ARIA labels on interactive elements
- Heading hierarchy (h1 → h2 → h3 contiguous)
- Form fields have associated labels
- Buttons have accessible names
- Focus order is logical
- `role="dialog"` on modals, `aria-modal="true"`, focus trap

### Design quality (from snapshot + optional screenshot)

- Typography hierarchy (headings, body, captions distinct)
- Color consistency with app theme (check Tailwind tokens in code, not pixel values)
- Spacing / 8px grid (visible in screenshot only)
- State handling visible: loading, empty, error
- Touch targets ≥ 44×44 px (web) — check CSS in code if unsure

## Default pages (if scope not specified)

| Page      | Route           | Focus                         |
|-----------|-----------------|-------------------------------|
| Auth      | `/`             | Phone input, submit button    |
| PIN       | `/pin`          | Keypad layout, error state    |
| Auto list | `/(authenticated)/` | Vehicle cards, empty state |
| Charges   | `/charges`      | Fine list, selection          |
| Payment   | `/fine-payment` | Amount display, confirm CTA   |

Review them one by one. Do NOT load them all in parallel (session ordering matters).

## Output

```
## Design Review: <scope>

### Accessibility: <score/5>
- <finding 1>
- <finding 2>

### Design Quality: <score/5>
- <finding 1>
- <finding 2>

### Priority Improvements
1. <highest impact change + file path>
2. <next>
3. <next>
```
