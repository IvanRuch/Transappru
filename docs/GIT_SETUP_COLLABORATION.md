# 🔄 Настройка Git для совместной работы

## ✅ Текущая конфигурация (обновлено 2025-12-29)

**Репозитории:**
- **origin:** `git@github.com:grizodubov/TransApp_upd.git` (ваш репозиторий)
- **upstream:** `git@github.com:IvanRuch/Transappru.git` (репозиторий коллеги)

**Ветки:**
- Локальная ветка: `master`
- Ветка коллеги: `functional-ts` в upstream

**Статус синхронизации:** ✅ Репозитории синхронизированы (версия 2.0.7)

---

## 🔄 Текущая конфигурация remotes

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd
git remote -v
```

Результат:
```
origin    git@github.com:grizodubov/TransApp_upd.git (fetch)
origin    git@github.com:grizodubov/TransApp_upd.git (push)
upstream  git@github.com:IvanRuch/Transappru.git (fetch)
upstream  git@github.com:IvanRuch/Transappru.git (push)
```

---

## 📊 История синхронизации

**2025-12-29:** Успешно отправлены коммиты версий 2.0.3-2.0.7 в upstream/functional-ts
- Отправлено: 135 объектов (63.52 KiB)
- Диапазон коммитов: `0c9b0bc..28f6d08`
- Команда: `git push upstream master:functional-ts`

---

## 🔄 Рабочий процесс (workflow)

### Ежедневная работа:

```bash
# 1. Получить последние изменения от коллеги
git fetch upstream
git merge upstream/functional-ts
# Или: git pull upstream functional-ts

# 2. Внести свои изменения
# ... работа над кодом ...

# 3. Закоммитить
git add .
git commit -m "Описание изменений"

# 4. Отправить в свой репозиторий (бэкап)
git push origin master

# 5. Отправить коллеге
git push upstream master:functional-ts
```

---

## 🎯 Альтернатива: Работать напрямую с веткой functional-ts

### Вариант A: Создать локальную ветку, отслеживающую ветку коллеги

```bash
# Создать и переключиться на локальную ветку functional-ts
git checkout -b functional-ts upstream/functional-ts

# Теперь можно просто:
git pull  # получить изменения от коллеги
git push  # отправить изменения коллеге
```

### Вариант B: Переключить текущую ветку на отслеживание ветки коллеги

```bash
# Если вы на ветке master
git branch --set-upstream-to=upstream/functional-ts master

# Теперь:
git pull  # получает из upstream/functional-ts
git push upstream master:functional-ts  # отправляет в upstream/functional-ts
```

---

## 📋 Проверка перед push

```bash
# Посмотреть что изменилось
git status

# Посмотреть разницу
git diff

# Посмотреть историю коммитов
git log --oneline -10

# Посмотреть что будет отправлено
git log upstream/functional-ts..master --oneline
```

---

## 🔧 Полезные команды

```bash
# Посмотреть все remotes
git remote -v

# Посмотреть все ветки (локальные и удалённые)
git branch -a

# Удалить remote (если ошиблись)
git remote remove upstream

# Переименовать remote
git remote rename upstream colleague

# Изменить URL remote
git remote set-url upstream git@github.com:IvanRuch/Transappru.git

# Синхронизировать с веткой коллеги
git fetch upstream
git merge upstream/functional-ts

# Отправить конкретный коммит
git cherry-pick <commit-hash>
git push upstream master:functional-ts
```

---

## ⚠️ Важные моменты

### 1. Конфликты при merge
Если возникают конфликты:
```bash
git fetch upstream
git merge upstream/functional-ts
# Разрешить конфликты в файлах
git add .
git commit -m "Merge: разрешены конфликты"
git push upstream master:functional-ts
```

### 2. История коммитов
Коллега сохранил историю, поэтому:
- Не делайте `git push --force` в ветку коллеги
- Используйте обычный `git push`

### 3. Права доступа
Убедитесь что у вас есть права на push в репозиторий коллеги:
- Коллега должен добавить вас как collaborator
- Или вы можете создавать Pull Requests

---

## 🚀 Быстрый старт для новых фич

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd

# 1. Получить последние изменения
git fetch upstream
git merge upstream/functional-ts

# 2. Внести изменения и закоммитить
git add .
git commit -m "feat: описание новой фичи"

# 3. Отправить в свой репозиторий
git push origin master

# 4. Отправить коллеге
git push upstream master:functional-ts

# Готово! ✅
```

---

## 📞 Если возникли проблемы

### Ошибка: "Permission denied"
**Решение:** Попросите коллегу добавить вас как collaborator:
1. GitHub → Repository Settings → Collaborators
2. Add people → ваш GitHub username

### Ошибка: "Updates were rejected"
**Решение:** Сначала получите изменения коллеги:
```bash
git fetch upstream
git merge upstream/functional-ts
# Разрешить конфликты если есть
git push upstream master:functional-ts
```

### Ошибка: "fatal: refusing to merge unrelated histories"
**Решение:**
```bash
git merge upstream/functional-ts --allow-unrelated-histories
```

---

## 📝 Рекомендации

1. **Всегда делайте `git fetch` перед началом работы**
2. **Коммитьте часто с понятными сообщениями**
3. **Перед push проверяйте `git status` и `git log`**
4. **Сохраняйте изменения в свой репозиторий как бэкап**
5. **Общайтесь с коллегой о больших изменениях**

---

## 🎯 Итоговая команда для отправки изменений

```bash
# Одной командой (после коммита):
git push upstream master:functional-ts
```

**Готово!** Репозитории синхронизированы, можно продолжать разработку новых фич! 🚀
