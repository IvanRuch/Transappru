Run Expo / EAS build verification.

Argument: `$ARGUMENTS`
- empty or `check` — TypeScript + ESLint only (fastest)
- `web` — Expo Web export
- `ios` — EAS local iOS build (development profile)
- `android` — EAS local Android build (development profile)

## Steps

1. Always run TypeScript check first — abort build on TS errors.
2. Then run the platform-specific command (if any).
3. Report pass/fail; on failure: root cause + suggested fix.

## Commands

### check (default)

```bash
npx tsc --noEmit && npx expo lint
```

### web

```bash
npx tsc --noEmit && npx expo export --platform web
```

### ios

```bash
npx tsc --noEmit && eas build --platform ios --profile development --local
```

### android

```bash
npx tsc --noEmit && eas build --platform android --profile development --local
```

## Output

```
## Build: <mode>

| Step       | Status | Time |
|------------|--------|------|
| TypeScript | ✅/❌  | Ns   |
| <build>    | ✅/❌  | Ns   |

<on failure: top 3 errors with file:line and suggested fix>
```
