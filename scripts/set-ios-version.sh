#!/bin/bash
# Этот скрипт подставляет версию из package.json в Info.plist для iOS

# Путь до Info.plist
PLIST_FILE="./ios/TransApp/Info.plist"

# Берем версию из package.json
VERSION=$(node -p "require('./package.json').version")

# Меняем CFBundleShortVersionString (Version)
# Меняем CFBundleVersion (Build) на то же значение или отдельно
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$PLIST_FILE"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION" "$PLIST_FILE"

echo "iOS version set to $VERSION"
