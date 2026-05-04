#!/bin/bash

# Скрипт автоматической настройки проекта для Mac M2
# Использование: bash scripts/setup-mac-m2.sh

set -e

echo "🚀 Настройка проекта TransApp для Mac M2..."
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода предупреждения
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Функция для вывода ошибки
error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "📋 Шаг 1: Проверка окружения..."

# Проверка Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    success "Node.js установлен: $NODE_VERSION"
else
    error "Node.js не установлен. Установите через: brew install node"
    exit 1
fi

# Проверка Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    success "Java установлена: $JAVA_VERSION"
else
    warning "Java не установлена. Устанавливаем..."
    if command -v brew &> /dev/null; then
        brew install openjdk@17
        success "Java 17 установлена"
    else
        error "Homebrew не установлен. Установите с https://brew.sh/"
        exit 1
    fi
fi

# Проверка Android SDK
if [ -d "$HOME/Library/Android/sdk" ]; then
    success "Android SDK найден: $HOME/Library/Android/sdk"
else
    warning "Android SDK не найден. Установите Android Studio и SDK."
    echo "Скачать: https://developer.android.com/studio"
fi

echo ""
echo "📋 Шаг 2: Создание временной папки..."

# Создать временную папку
TMP_DIR="$HOME/tmp"
if [ ! -d "$TMP_DIR" ]; then
    mkdir -p "$TMP_DIR"
    success "Создана временная папка: $TMP_DIR"
else
    success "Временная папка уже существует: $TMP_DIR"
fi

# Дать права
chmod -R 777 "$TMP_DIR" 2>/dev/null || true

echo ""
echo "📋 Шаг 3: Настройка переменных окружения..."

# Проверить какой shell используется
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.zshrc"
fi

# Проверить существует ли файл
touch "$SHELL_RC"

# Добавить переменные если их нет
if ! grep -q "export TMPDIR=~/tmp" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# TransApp - Temporary directories" >> "$SHELL_RC"
    echo "export TMPDIR=~/tmp" >> "$SHELL_RC"
    echo "export TEMP=~/tmp" >> "$SHELL_RC"
    echo "export TMP=~/tmp" >> "$SHELL_RC"
    success "Добавлены переменные TMPDIR в $SHELL_RC"
else
    success "Переменные TMPDIR уже настроены"
fi

# Добавить Android SDK если его нет
if ! grep -q "export ANDROID_HOME" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# TransApp - Android SDK" >> "$SHELL_RC"
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> "$SHELL_RC"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator" >> "$SHELL_RC"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> "$SHELL_RC"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools" >> "$SHELL_RC"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin" >> "$SHELL_RC"
    success "Добавлены переменные Android SDK в $SHELL_RC"
else
    success "Переменные Android SDK уже настроены"
fi

# Применить переменные для текущей сессии
export TMPDIR=~/tmp
export TEMP=~/tmp
export TMP=~/tmp
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo ""
echo "📋 Шаг 4: Очистка старых файлов..."

# Удалить node_modules если существует
if [ -d "node_modules" ]; then
    warning "Удаление node_modules..."
    rm -rf node_modules
    success "node_modules удалён"
fi

# Удалить lock файлы
rm -f package-lock.json yarn.lock 2>/dev/null || true

# Очистить Metro cache
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
success "Кэш Metro очищен"

# Очистить Gradle cache если существует
if [ -d "android" ]; then
    cd android
    if [ -f "gradlew" ]; then
        chmod +x gradlew
        ./gradlew clean 2>/dev/null || true
        success "Gradle cache очищен"
    fi
    cd ..
fi

echo ""
echo "📋 Шаг 5: Установка зависимостей..."

npm install
success "npm зависимости установлены"

echo ""
echo "📋 Шаг 6: Настройка Android..."

if [ -d "android" ]; then
    cd android
    
    # Создать local.properties
    if [ -d "$ANDROID_HOME" ]; then
        echo "sdk.dir=$ANDROID_HOME" > local.properties
        success "Создан android/local.properties"
    else
        warning "Android SDK не найден, пропускаем создание local.properties"
    fi
    
    # Дать права на gradlew
    if [ -f "gradlew" ]; then
        chmod +x gradlew
        success "Права на gradlew установлены"
    fi
    
    cd ..
fi

echo ""
echo "📋 Шаг 7: Принятие лицензий Android SDK..."

# Принять лицензии Android SDK
if [ -d "$ANDROID_HOME" ]; then
    if [ -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
        success "Принимаем лицензии Android SDK..."
        yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses 2>/dev/null || warning "Не удалось принять лицензии автоматически"
    else
        warning "sdkmanager не найден. Принять лицензии вручную:"
        echo "  yes | \$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses"
        echo "  Или через Android Studio → SDK Tools → Command-line Tools"
    fi
else
    warning "Android SDK не найден, пропускаем принятие лицензий"
fi

echo ""
echo "📋 Шаг 8: Проверка настроек..."

# Проверить adb
if command -v adb &> /dev/null; then
    success "adb доступен"
    echo "Подключенные устройства:"
    adb devices
else
    warning "adb не найден. Убедитесь что Android SDK установлен."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Настройка завершена!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Следующие шаги:"
echo ""
echo "1. Перезапустите терминал или выполните:"
echo "   source $SHELL_RC"
echo ""
echo "2. Запустите эмулятор Android или подключите устройство"
echo ""
echo "3. Запустите проект:"
echo "   npx expo start"
echo "   npm run android"
echo ""
echo "📖 Подробная документация: Writerside/topics/setup-mac-m2.md"
echo ""
warning "ВАЖНО: Перезапустите терминал для применения переменных окружения!"
echo ""
