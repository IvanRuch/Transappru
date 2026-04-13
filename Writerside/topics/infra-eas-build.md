# EAS Build

<!-- Content to be migrated from /docs/ -->

## Profiles

Defined in `eas.json`:

- **development** — debug builds for testing
- **preview** — internal distribution
- **production** — App Store / Google Play release

## Build Commands

```bash
# iOS development build
eas build --platform ios --profile development

# Android development build
eas build --platform android --profile development

# Production build
eas build --platform all --profile production
```
