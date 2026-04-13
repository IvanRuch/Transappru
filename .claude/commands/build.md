Run Expo/EAS build verification.

Argument: $ARGUMENTS (optional: `ios`, `android`, `web`, `check`, or blank for typecheck only)

## Modes

- No argument or `check`: TypeScript check + ESLint only (fastest)

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && npx tsc --noEmit && npx expo lint
```

- `ios`: EAS build for iOS

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && eas build --platform ios --profile development --local
```

- `android`: EAS build for Android

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && eas build --platform android --profile development --local
```

- `web`: Expo web export

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd && npx expo export --platform web
```

## Steps

1. Always run TypeScript check first
2. If platform specified, run the corresponding build
3. Report build result and any errors
4. For build failures, identify the root cause and suggest fixes
