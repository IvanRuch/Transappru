# 🔧 Настройка IntelliJ IDEA для проекта

## ✅ Что было исправлено

1. **VCS конфигурация** - удалена ссылка на несуществующую папку `old-project`
2. **Тип модуля** - изменён с `JAVA_MODULE` на `WEB_MODULE`
3. **Исключения** - добавлены `node_modules`, `.expo`, `dist`
4. **JavaScript библиотеки** - добавлена поддержка Node.js Core
5. **SDK** - настроен Node.js как SDK проекта

## 🔄 Как применить изменения

### Вариант 1: Перезагрузить IDEA (рекомендуется)

1. Закройте IntelliJ IDEA полностью
2. Откройте проект заново
3. IDEA автоматически применит новые настройки

### Вариант 2: Инвалидировать кэш

Если после перезагрузки проблемы остались:

1. **File → Invalidate Caches...**
2. Выберите:
   - ✅ Invalidate and Restart
   - ✅ Clear file system cache and Local History
   - ✅ Clear downloaded shared indexes
3. Нажмите **Invalidate and Restart**

## 📊 Что вы должны увидеть после перезагрузки

### 1. Структура проекта в левом меню

```
TransApp_upd/
├── 📁 .idea/              # Конфигурация IDEA
├── 📁 .vscode/            # Конфигурация VS Code
├── 📁 app/                # Expo Router (точка входа)
│   ├── 📁 (authenticated)/ # Защищённые маршруты
│   ├── 📄 _layout.tsx
│   ├── 📄 index.tsx
│   └── ...
├── 📁 src/
│   ├── 📁 screens/        # Экраны приложения
│   ├── 📁 components/     # Компоненты
│   ├── 📁 services/       # API, Firebase
│   ├── 📁 types/          # TypeScript типы
│   └── 📁 utils/          # Утилиты
├── 📁 assets/             # Изображения
├── 📁 docs/               # Документация
├── 📁 plugins/            # Expo config plugins
├── 📄 package.json
├── 📄 tsconfig.json
└── ...
```

### 2. Git коммиты в инструменте Git

Вы должны увидеть последние коммиты:

```
d519ce0 fix: update IDEA project configuration for Node.js/Expo project
d0f70a4 docs: add migration completion summary
c96beaf Android UI fixes and header unification
c47f362 Complete Android Studio start app
9481b33 Complete iOS debugging
...
```

### 3. Правильная подсветка синтаксиса

- ✅ TypeScript файлы (`.ts`, `.tsx`) с подсветкой
- ✅ JavaScript файлы (`.js`) с подсветкой
- ✅ JSON файлы с валидацией
- ✅ Markdown файлы с превью

## 🐛 Если проблемы остались

### Проблема: Не видно Git коммитов

**Решение:**
1. Откройте **Git → Log** (⌘9 на Mac, Alt+9 на Windows)
2. Убедитесь, что выбрана ветка `feature/react-native-update`
3. Если коммиты не видны, выполните:
   ```bash
   git log --oneline -10
   ```
   в терминале IDEA

### Проблема: Структура файлов неправильная

**Решение:**
1. Правой кнопкой на корень проекта → **Mark Directory as → Unmark as Sources Root**
2. Правой кнопкой на `src/` → **Mark Directory as → Sources Root**
3. Правой кнопкой на `node_modules/` → **Mark Directory as → Excluded**

### Проблема: TypeScript не работает

**Решение:**
1. **File → Settings → Languages & Frameworks → TypeScript**
2. Убедитесь, что:
   - ✅ TypeScript Language Service включён
   - ✅ Путь к TypeScript: `./node_modules/typescript/lib`
   - ✅ tsconfig.json: `./tsconfig.json`

### Проблема: Node.js SDK не найден

**Решение:**
1. **File → Project Structure → Project Settings → Project**
2. **SDK:** выберите Node.js (если нет, нажмите **New → Node.js**)
3. Выберите путь к Node.js (обычно `/usr/local/bin/node` или `~/.nvm/versions/node/...`)

## 📝 Проверка настроек

Выполните в терминале IDEA:

```bash
# Проверить Git
git status
git log --oneline -5

# Проверить Node.js
node --version
npm --version

# Проверить зависимости
npm list --depth=0
```

## ✨ Дополнительные настройки (опционально)

### Настроить ESLint

1. **File → Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
2. ✅ Automatic ESLint configuration
3. ✅ Run eslint --fix on save

### Настроить Prettier

1. **File → Settings → Languages & Frameworks → JavaScript → Prettier**
2. Prettier package: `./node_modules/prettier`
3. ✅ On 'Reformat Code' action
4. ✅ On save

### Настроить React Native

1. **File → Settings → Languages & Frameworks → JavaScript → React Native**
2. ✅ Enable React Native support

## 🎯 Готово!

После выполнения этих шагов IDEA должна правильно отображать:
- ✅ Структуру проекта
- ✅ Git коммиты и историю
- ✅ TypeScript подсветку и автодополнение
- ✅ Node.js модули

---

**Если проблемы остались, попробуйте полностью переоткрыть проект:**

1. **File → Close Project**
2. Удалите папку `.idea/` (если нужно)
3. Откройте проект заново через **Open**
4. IDEA пересоздаст конфигурацию автоматически
