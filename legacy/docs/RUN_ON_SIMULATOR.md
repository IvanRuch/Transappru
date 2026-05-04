# 📱 Запуск на iOS симуляторе

## 🎯 Как запустить на конкретном эмуляторе

### Способ 1: Expo CLI (рекомендуется)

#### Шаг 1: Посмотреть доступные симуляторы
```bash
xcrun simctl list devices available
```

**Вывод:**
```
-- iOS 17.5 --
    iPhone SE (3rd generation) (UDID-1234) (Shutdown)
    iPhone 15 (UDID-5678) (Shutdown)
    iPhone 15 Pro (UDID-9012) (Shutdown)
    iPhone 15 Pro Max (UDID-3456) (Shutdown)
    iPad Pro (11-inch) (UDID-7890) (Shutdown)
```

#### Шаг 2: Запустить на конкретном симуляторе

**Вариант A: По имени устройства**
```bash
npx expo run:ios --device "iPhone 15 Pro"
```

**Вариант B: По UDID**
```bash
npx expo run:ios --device UDID-9012
```

**Вариант C: Интерактивный выбор**
```bash
npx expo run:ios
# Expo покажет список и предложит выбрать
```

---

## 🚀 Быстрые команды

### Запуск на iPhone 15 Pro
```bash
npx expo run:ios --device "iPhone 15 Pro"
```

### Запуск на iPhone SE
```bash
npx expo run:ios --device "iPhone SE (3rd generation)"
```

### Запуск на iPad
```bash
npx expo run:ios --device "iPad Pro (11-inch)"
```

### Запуск на последнем использованном
```bash
npx expo run:ios
# Автоматически выберет последний использованный симулятор
```

---

## 🔧 Способ 2: React Native CLI

### Запуск на конкретном симуляторе
```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### Запуск на iPad
```bash
npx react-native run-ios --simulator="iPad Pro (11-inch)"
```

---

## 📋 Управление симуляторами

### Посмотреть все симуляторы
```bash
xcrun simctl list devices
```

### Посмотреть только доступные
```bash
xcrun simctl list devices available
```

### Посмотреть только запущенные
```bash
xcrun simctl list devices | grep "Booted"
```

### Запустить симулятор вручную
```bash
# По имени
open -a Simulator --args -CurrentDeviceUDID UDID-9012

# Или просто открыть последний
open -a Simulator
```

### Закрыть все симуляторы
```bash
killall Simulator
```

### Удалить все недоступные симуляторы
```bash
xcrun simctl delete unavailable
```

---

## 🎨 Создание алиасов (для удобства)

### В ~/.zshrc или ~/.bashrc добавьте:

```bash
# iOS симуляторы
alias ios15="npx expo run:ios --device 'iPhone 15 Pro'"
alias ios15max="npx expo run:ios --device 'iPhone 15 Pro Max'"
alias iphone15="npx expo run:ios --device 'iPhone 15'"
alias iphonese="npx expo run:ios --device 'iPhone SE (3rd generation)'"
alias ipad="npx expo run:ios --device 'iPad Pro (11-inch)'"

# Открыть симулятор
alias simulator="open -a Simulator"

# Список симуляторов
alias ios-list="xcrun simctl list devices available"
```

**Использование:**
```bash
# Перезагрузить терминал
source ~/.zshrc

# Запустить
ios15
ipad
```

---

## 📱 Способ 3: Через Xcode

### Шаг 1: Открыть проект в Xcode
```bash
cd ios
xed .
```

### Шаг 2: Выбрать симулятор
1. В Xcode вверху выберите симулятор из выпадающего списка
2. Нажмите ▶️ (Run)

---

## 🔍 Способ 4: Через package.json scripts

### Добавьте в package.json:

```json
{
  "scripts": {
    "ios": "expo run:ios",
    "ios:15": "expo run:ios --device 'iPhone 15 Pro'",
    "ios:15max": "expo run:ios --device 'iPhone 15 Pro Max'",
    "ios:se": "expo run:ios --device 'iPhone SE (3rd generation)'",
    "ios:ipad": "expo run:ios --device 'iPad Pro (11-inch)'",
    "android": "expo run:android"
  }
}
```

**Использование:**
```bash
npm run ios:15
npm run ios:15max
npm run ios:se
npm run ios:ipad
```

---

## 🐛 Troubleshooting

### Проблема: "No devices found"

**Решение 1: Установить Xcode Command Line Tools**
```bash
xcode-select --install
```

**Решение 2: Проверить путь к Xcode**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

**Решение 3: Создать новый симулятор**
1. Открыть Xcode
2. Window → Devices and Simulators
3. Нажать "+" и создать новый симулятор

### Проблема: Симулятор не запускается

**Решение 1: Перезапустить симулятор**
```bash
killall Simulator
open -a Simulator
```

**Решение 2: Очистить кэш**
```bash
xcrun simctl erase all
```

**Решение 3: Удалить и пересоздать**
```bash
# Удалить конкретный симулятор
xcrun simctl delete UDID-9012

# Создать новый в Xcode
```

### Проблема: "Build failed"

**Решение 1: Очистить build**
```bash
cd ios
rm -rf build
cd ..
npx expo run:ios --device "iPhone 15 Pro"
```

**Решение 2: Очистить Pods**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios --device "iPhone 15 Pro"
```

**Решение 3: Очистить все**
```bash
# Очистить node_modules
rm -rf node_modules
npm install

# Очистить iOS
cd ios
rm -rf build Pods Podfile.lock
pod install
cd ..

# Очистить Expo кэш
npx expo start -c

# Запустить
npx expo run:ios --device "iPhone 15 Pro"
```

---

## 🎯 Рекомендации для вашего проекта

### Для разработки (быстрый старт)
```bash
npx expo start
# Нажмите 'i' для iOS
# Expo автоматически выберет симулятор
```

### Для тестирования на конкретном устройстве
```bash
# iPhone 15 Pro (самый популярный)
npx expo run:ios --device "iPhone 15 Pro"

# iPhone SE (маленький экран)
npx expo run:ios --device "iPhone SE (3rd generation)"

# iPad (планшет)
npx expo run:ios --device "iPad Pro (11-inch)"
```

### Для production build
```bash
# Сначала соберите
npx expo run:ios --configuration Release --device "iPhone 15 Pro"
```

---

## 📊 Сравнение способов

| Способ | Команда | Плюсы | Минусы |
|--------|---------|-------|--------|
| Expo CLI | `npx expo run:ios --device "..."` | ✅ Просто<br>✅ Быстро | ❌ Нужен Expo |
| React Native | `npx react-native run-ios --simulator="..."` | ✅ Без Expo | ❌ Длиннее |
| Xcode | GUI | ✅ Визуально | ❌ Медленно |
| npm scripts | `npm run ios:15` | ✅ Короткие команды | ❌ Нужна настройка |

---

## 💡 Мои рекомендации

### Для вашего проекта добавьте в package.json:

```json
{
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "ios:15": "expo run:ios --device 'iPhone 15 Pro'",
    "ios:se": "expo run:ios --device 'iPhone SE (3rd generation)'",
    "android": "expo run:android",
    "type-check": "tsc --noEmit"
  }
}
```

### Использование:

```bash
# Быстрый старт (выбор симулятора вручную)
npm start
# Нажать 'i'

# Запуск на iPhone 15 Pro
npm run ios:15

# Запуск на iPhone SE
npm run ios:se
```

---

## 🔥 Быстрая шпаргалка

```bash
# Посмотреть доступные симуляторы
xcrun simctl list devices available

# Запустить на конкретном
npx expo run:ios --device "iPhone 15 Pro"

# Запустить с выбором
npx expo run:ios

# Открыть симулятор
open -a Simulator

# Закрыть все симуляторы
killall Simulator

# Очистить кэш
npx expo start -c
```

---

## ✨ Итого

**Для запуска на конкретном эмуляторе:**

```bash
# Способ 1: Указать имя устройства
npx expo run:ios --device "iPhone 15 Pro"

# Способ 2: Интерактивный выбор
npx expo run:ios

# Способ 3: Через npm script (после настройки)
npm run ios:15
```

**Рекомендую:** Добавить npm scripts для удобства!

---

**Дата:** 2025-11-04  
**Для проекта:** TransApp_upd ✅
