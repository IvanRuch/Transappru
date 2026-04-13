Visual UI/UX design review using Playwright MCP for screenshots and analysis.

Argument: $ARGUMENTS (default: review all available pages)

## Modes

- No argument: review web version at localhost:8081 (Expo web)
- `web`: transappweb at localhost:3000
- `expo-web`: Expo web at localhost:8081
- `component:<name>`: review specific component (search in src/components/)
- `compare`: side-by-side comparison of mobile web vs desktop web

## Prerequisites

Check that the dev server is running before proceeding. If not running, warn the user.

## Steps

1. Navigate to each page using Playwright MCP (`browser_navigate`)
2. Take screenshot (`browser_take_screenshot`)
3. Get accessibility snapshot (`browser_snapshot`)

## Analysis checklist

### Accessibility (WCAG AA)
- Color contrast ratio >= 4.5:1 for text
- Touch targets >= 44x44px
- ARIA labels on interactive elements
- Keyboard navigability
- Focus indicators visible

### Design Quality
- Typography hierarchy (headings, body, captions)
- Color consistency with app theme
- Spacing and alignment (8px grid)
- Layout responsiveness
- State handling (loading, empty, error)
- Visual hierarchy and information density

## Pages to check

| Page        | Route/URL            | What to verify              |
|-------------|----------------------|-----------------------------|
| Auth        | /                    | Login flow, phone input     |
| PIN         | /pin                 | PIN entry, keypad layout    |
| Auto list   | /(authenticated)/    | Vehicle cards, empty state  |
| Charges     | /charges             | Fine list, selection UX     |
| Payment     | /fine-payment        | Payment flow, amounts       |

## Output: Design Review Report

```
## Design Review: [scope]

### Accessibility: [score/5]
- [findings]

### Design Quality: [score/5]
- [findings]

### Priority Improvements
1. [highest impact change]
2. ...
3. ...
```
