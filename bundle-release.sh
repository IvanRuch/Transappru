#!/bin/bash
set -e

export TMPDIR=$PWD/.tmp
mkdir -p $TMPDIR

# Ограничиваем нагрузку на Node/Metro
export REACT_NATIVE_MAX_WORKERS=2
export CI=true

echo "🧹 Чистим Metro cache и Android assets..."
rm -rf android/app/src/main/assets/index.android.bundle
rm -rf android/app/src/main/res/drawable-*
rm -rf android/app/src/main/res/raw
rm -rf .metro-cache

# ✅ гарантируем, что папки существуют
mkdir -p android/app/src/main/assets
mkdir -p android/app/src/main/res/raw

echo "🔄 Перезапускаем watchman..."
watchman watch-del-all || true
watchman shutdown-server || true

echo "📦 Бандлим JS для Android release..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --reset-cache \
  --max-workers 2

echo "✅ Бандлинг завершён успешно!"
