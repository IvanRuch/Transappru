# 🔧 TypeScript команды - Объяснение

## 📝 Команда: `npx tsc --noEmit 2>&1 | tail -5`

### Разбор по частям

```bash
npx tsc --noEmit 2>&1 | tail -5
│   │   │         │    │ │
│   │   │         │    │ └─ Показать последние 5 строк
│   │   │         │    └─── Pipe (передать вывод дальше)
│   │   │         └──────── Перенаправить stderr в stdout
│   │   └────────────────── Флаг: не создавать JS файлы
│   └────────────────────── TypeScript Compiler
└────────────────────────── Node Package Execute
```

---

## 1️⃣ `npx`

**Что это:** Node Package Execute

**Что делает:**
- Запускает пакет из `node_modules/.bin/`
- Если пакета нет - скачивает временно и запускает
- Не нужно устанавливать глобально

**Пример:**
```bash
# Вместо
./node_modules/.bin/tsc --noEmit

# Можно
npx tsc --noEmit
```

---

## 2️⃣ `tsc`

**Что это:** TypeScript Compiler

**Что делает:**
- Компилирует TypeScript в JavaScript
- Проверяет типы
- Находит ошибки

**Без флагов:**
```bash
tsc
# Создаст .js файлы из .ts файлов
```

---

## 3️⃣ `--noEmit`

**Что это:** Флаг "не создавать файлы"

**Что делает:**
- Проверяет типы
- НЕ создает .js файлы
- Только показывает ошибки

**Зачем нужно:**
- Для проверки перед коммитом
- В CI/CD для валидации
- Когда компиляцию делает другой инструмент (Expo, Webpack)

**Пример:**
```bash
# Только проверка типов (не создает файлы)
npx tsc --noEmit

# Вывод:
# src/screens/Main.tsx(45,10): error TS2339: Property 'navigate' does not exist
```

---

## 4️⃣ `2>&1`

**Что это:** Перенаправление потоков

**Что делает:**
- `2` = stderr (поток ошибок)
- `1` = stdout (стандартный вывод)
- `2>&1` = перенаправить stderr в stdout

**Зачем нужно:**
- TypeScript выводит ошибки в stderr
- Pipe `|` работает только со stdout
- Нужно объединить потоки

**Пример:**
```bash
# Без 2>&1 - tail не увидит ошибки
npx tsc --noEmit | tail -5
# (пусто)

# С 2>&1 - tail увидит ошибки
npx tsc --noEmit 2>&1 | tail -5
# (последние 5 ошибок)
```

**Объяснение потоков:**
- **stdin (0)** - стандартный ввод
- **stdout (1)** - стандартный вывод (обычные сообщения)
- **stderr (2)** - поток ошибок (ошибки и предупреждения)

---

## 5️⃣ `|` (pipe)

**Что это:** Конвейер (pipe)

**Что делает:**
- Передает вывод одной команды на вход другой
- Позволяет комбинировать команды

**Пример:**
```bash
# Вывод tsc передается в tail
npx tsc --noEmit 2>&1 | tail -5

# Можно делать цепочки
cat file.txt | grep "error" | wc -l
```

---

## 6️⃣ `tail -5`

**Что это:** Показать конец файла/вывода

**Что делает:**
- Показывает последние N строк
- `-5` = последние 5 строк

**Зачем нужно:**
- TypeScript может выдать сотни ошибок
- Нужны только последние (обычно самые важные)
- Или просто посмотреть итог

**Примеры:**
```bash
# Последние 5 строк
tail -5

# Последние 10 строк
tail -10

# Последние 20 строк
tail -20

# Первые 5 строк (head вместо tail)
head -5
```

---

## 🎯 Полная команда в действии

### Пример 1: Много ошибок

```bash
$ npx tsc --noEmit 2>&1 | tail -5

src/screens/Main.tsx(120,15): error TS2339: Property 'navigate' does not exist
src/screens/Auto.tsx(45,10): error TS2345: Argument of type 'string' is not assignable
src/screens/User.tsx(78,5): error TS2322: Type 'number' is not assignable to type 'string'

Found 872 errors in 8 files.
```

**Что видим:**
- Последние 3 ошибки
- Итоговое сообщение (872 ошибки в 8 файлах)

### Пример 2: Нет ошибок

```bash
$ npx tsc --noEmit 2>&1 | tail -5

# (пусто - нет вывода, значит нет ошибок)
```

---

## 🔧 Полезные вариации

### Показать первые ошибки
```bash
npx tsc --noEmit 2>&1 | head -10
```

### Посчитать количество ошибок
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

### Показать только файлы с ошибками
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u
```

### Показать ошибки в конкретном файле
```bash
npx tsc --noEmit 2>&1 | grep "AuthScreen.tsx"
```

### Сохранить все ошибки в файл
```bash
npx tsc --noEmit 2>&1 > errors.txt
```

### Показать только количество ошибок
```bash
npx tsc --noEmit 2>&1 | tail -1
# Found 872 errors in 8 files.
```

---

## 📊 Практическое применение

### 1. Перед коммитом
```bash
# Проверить что нет новых ошибок
npx tsc --noEmit 2>&1 | tail -5
```

### 2. В CI/CD
```bash
# В GitHub Actions / GitLab CI
- name: Type check
  run: npx tsc --noEmit
```

### 3. В package.json scripts
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check-watch": "tsc --noEmit --watch"
  }
}
```

Использование:
```bash
npm run type-check
```

### 4. Pre-commit hook
```bash
# .husky/pre-commit
#!/bin/sh
npx tsc --noEmit || exit 1
```

---

## 🎓 Дополнительные флаги tsc

### `--watch` - следить за изменениями
```bash
npx tsc --noEmit --watch
# Будет проверять типы при каждом изменении файла
```

### `--pretty` - красивый вывод
```bash
npx tsc --noEmit --pretty
# Цветной вывод с подсветкой
```

### `--project` - указать tsconfig
```bash
npx tsc --noEmit --project tsconfig.json
```

### `--incremental` - инкрементальная проверка
```bash
npx tsc --noEmit --incremental
# Проверяет только измененные файлы (быстрее)
```

---

## 💡 Для вашего проекта

### Проверить все ошибки
```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd
npx tsc --noEmit
```

### Посмотреть последние ошибки
```bash
npx tsc --noEmit 2>&1 | tail -10
```

### Посчитать ошибки
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

### Какие файлы с ошибками
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u
```

### Добавить в package.json
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

---

## 📚 Шпаргалка

| Команда | Что делает |
|---------|------------|
| `npx tsc --noEmit` | Проверить типы (не создавать файлы) |
| `npx tsc --noEmit 2>&1` | Перенаправить ошибки в stdout |
| `npx tsc --noEmit 2>&1 \| tail -5` | Показать последние 5 строк |
| `npx tsc --noEmit 2>&1 \| head -10` | Показать первые 10 строк |
| `npx tsc --noEmit 2>&1 \| grep "error"` | Показать только ошибки |
| `npx tsc --noEmit 2>&1 \| wc -l` | Посчитать строки |
| `npx tsc --noEmit --watch` | Следить за изменениями |
| `npx tsc --noEmit --pretty` | Красивый вывод |

---

## ✨ Итого

**Команда `npx tsc --noEmit 2>&1 | tail -5` делает:**

1. **npx** - запускает TypeScript компилятор
2. **tsc** - TypeScript Compiler
3. **--noEmit** - только проверка типов, не создавать файлы
4. **2>&1** - перенаправить ошибки в стандартный вывод
5. **|** - передать вывод дальше
6. **tail -5** - показать последние 5 строк

**Результат:** Показывает последние 5 строк ошибок TypeScript

**Зачем:** Быстро увидеть итог проверки типов без просмотра всех ошибок

---

**Дата:** 2025-11-04  
**Полезно для:** Проверки типов перед коммитом ✅
