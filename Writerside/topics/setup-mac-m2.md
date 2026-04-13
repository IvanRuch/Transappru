# Mac M2 Setup

<!-- Content to be migrated from /docs/SETUP_MAC_M2.md -->

## Prerequisites

- macOS on Apple Silicon (M1/M2/M3/M4)
- Node.js (via nvm recommended)
- Watchman: `brew install watchman`

## Setup

```bash
# Clone and install
git clone <repo>
cd TransApp_upd
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```
