#!/bin/bash

# Скрипт для отправки изменений коллеге
# Использование: bash scripts/push-to-colleague.sh "Сообщение коммита"

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Отправка изменений коллеге${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Проверка что мы в git репозитории
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Ошибка: не найдена папка .git${NC}"
    echo "Запустите скрипт из корня проекта"
    exit 1
fi

# Проверка наличия remote 'upstream'
if ! git remote | grep -q "^upstream$"; then
    echo -e "${YELLOW}⚠️  Remote 'upstream' не найден. Добавляем...${NC}"
    git remote add upstream git@github.com:IvanRuch/Transappru.git
    echo -e "${GREEN}✅ Remote 'upstream' добавлен${NC}"
fi

# Получить изменения от коллеги
echo -e "${BLUE}📥 Получение изменений от коллеги...${NC}"
git fetch upstream

# Проверить статус
echo ""
echo -e "${BLUE}📋 Статус изменений:${NC}"
git status --short

# Проверить есть ли незакоммиченные изменения
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo -e "${YELLOW}⚠️  Есть незакоммиченные изменения${NC}"
    
    # Получить сообщение коммита из аргумента или запросить
    if [ -z "$1" ]; then
        echo -e "${BLUE}Введите сообщение коммита:${NC}"
        read -r COMMIT_MSG
    else
        COMMIT_MSG="$1"
    fi
    
    # Добавить все изменения
    echo -e "${BLUE}📦 Добавление изменений...${NC}"
    git add .
    
    # Коммит
    echo -e "${BLUE}💾 Создание коммита...${NC}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ Коммит создан: $COMMIT_MSG${NC}"
else
    echo -e "${GREEN}✅ Нет незакоммиченных изменений${NC}"
fi

# Показать что будет отправлено
echo ""
echo -e "${BLUE}📊 Коммиты для отправки:${NC}"
git log upstream/functional-ts..HEAD --oneline --max-count=5 2>/dev/null || echo "Нет коммитов для отправки или ветка functional-ts ещё не получена"

# Подтверждение
echo ""
echo -e "${YELLOW}Отправить изменения в ветку functional-ts коллеги?${NC}"
echo -e "${YELLOW}Репозиторий: https://github.com/IvanRuch/Transappru${NC}"
echo -e "${YELLOW}Ветка: functional-ts${NC}"
read -p "Продолжить? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Отменено${NC}"
    exit 1
fi

# Отправить в репозиторий коллеги
echo ""
echo -e "${BLUE}🚀 Отправка в репозиторий коллеги...${NC}"
git push upstream HEAD:functional-ts

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Изменения успешно отправлены!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 Ссылка на ветку:${NC}"
echo "https://github.com/IvanRuch/Transappru/tree/functional-ts"
echo ""

# Опционально: отправить в свой репозиторий как бэкап
echo -e "${YELLOW}Отправить также в свой репозиторий (origin) как бэкап?${NC}"
read -p "(y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📤 Отправка в origin...${NC}"
    git push origin HEAD
    echo -e "${GREEN}✅ Отправлено в origin${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Готово!${NC}"
