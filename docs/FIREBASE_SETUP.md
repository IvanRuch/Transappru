# Firebase Configuration Setup

## 🔐 Безопасность конфигурационных файлов

Конфигурационные файлы Firebase содержат API ключи и другие секреты, которые **НЕ ДОЛЖНЫ** попадать в Git.

## 📁 Файлы конфигурации

### Android: `google-services.json`
- **Расположение:** Корень проекта (для Expo)
- **При сборке копируется в:** `android/app/google-services.json`

### iOS: `GoogleService-Info.plist`
- **Расположение:** Корень проекта (для Expo)
- **При сборке копируется в:** `ios/TransAppupd/GoogleService-Info.plist`

## 🚀 Первоначальная настройка

### 1. Получите боевые конфиги из Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. **Для Android:**
   - Настройки проекта → Ваши приложения → Android → Скачать `google-services.json`
4. **Для iOS:**
   - Настройки проекта → Ваши приложения → iOS → Скачать `GoogleService-Info.plist`

### 2. Добавьте конфиги в проект

```bash
# Скопируйте файлы в корень проекта
cp ~/Downloads/google-services.json ./google-services.json
cp ~/Downloads/GoogleService-Info.plist ./GoogleService-Info.plist
```

### 3. Проверьте .gitignore

Убедитесь, что файлы добавлены в `.gitignore`:

```gitignore
# Firebase configs (production secrets)
google-services.json
GoogleService-Info.plist
```

### 4. Проверьте, что файлы НЕ в Git

```bash
git status
# НЕ должно показать google-services.json и GoogleService-Info.plist
```

## 📋 Шаблоны для разработчиков

В репозитории есть примеры файлов:
- `google-services.json.example` - шаблон для Android
- `GoogleService-Info.plist.example` - шаблон для iOS

**Эти файлы содержат фиктивные данные и используются только как примеры структуры.**

### Для новых разработчиков:

1. Скопируйте примеры:
```bash
cp google-services.json.example google-services.json
cp GoogleService-Info.plist.example GoogleService-Info.plist
```

2. Замените фиктивные данные на боевые (получите у тимлида или из Firebase Console)

## 🔄 Обновление конфигов

Если нужно обновить Firebase конфигурацию:

1. Скачайте новые файлы из Firebase Console
2. Замените локальные файлы
3. **НЕ коммитьте их в Git**
4. При необходимости обновите `.example` файлы (если изменилась структура)

## ⚠️ Важно

- ✅ **МОЖНО** коммитить: `*.example` файлы
- ❌ **НЕЛЬЗЯ** коммитить: `google-services.json`, `GoogleService-Info.plist`
- 🔐 Боевые конфиги храните в защищенном месте (1Password, LastPass и т.д.)
- 📝 Если случайно закоммитили секреты - немедленно:
  1. Удалите из истории Git
  2. Ротируйте ключи в Firebase Console
  3. Скачайте новые конфиги

## 🛠️ Сборка приложения

При запуске `eas build` или `npx expo run:android/ios`, Expo автоматически копирует конфиги в нужные директории:

```
google-services.json → android/app/google-services.json
GoogleService-Info.plist → ios/TransAppupd/GoogleService-Info.plist
```

## 📱 Тестирование push-уведомлений

После настройки конфигов можно тестировать push:

```bash
# Отправить тестовое уведомление
npx expo push:android:upload --api-key <YOUR_FCM_KEY>
```

## 🔍 Проверка настройки

1. Убедитесь, что файлы существуют:
```bash
ls -la google-services.json GoogleService-Info.plist
```

2. Убедитесь, что файлы НЕ в Git:
```bash
git check-ignore google-services.json GoogleService-Info.plist
# Должно вывести оба файла
```

3. Соберите приложение и проверьте push-уведомления
