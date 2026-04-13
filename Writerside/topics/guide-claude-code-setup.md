# Claude Code Setup Guide

Пошаговая инструкция по настройке Claude Code для нового проекта.
Проверена на TransApp_upd (RN/Expo + Python) и tradesu-moderator (React + FastAPI).

> Используй этот документ как шаблон при переносе на другие проекты.

## 1. Структура директорий

```bash
mkdir -p .claude/commands .claude/hooks .claude/skills
mkdir -p Writerside/topics Writerside/images
```

| Директория | Назначение |
|-----------|-----------|
| `.claude/commands/` | Custom slash-команды (`/status`, `/verify`, ...) |
| `.claude/hooks/` | PostToolUse хуки (авто-линт, type-check) |
| `.claude/skills/` | Кастомные скиллы (гайды, схемы БД) |
| `Writerside/topics/` | Документация (Writerside формат) |

## 2. CLAUDE.md — иерархия файлов

### Принцип: Root = краткие правила, Sub = конвенции стека, Skills = детальные гайды

```
CLAUDE.md                      ← корневой (~50 строк)
├── src/CLAUDE.md              ← frontend конвенции
├── backend/CLAUDE.md          ← backend конвенции
├── .claude/rules.md           ← кросс-правила (ALWAYS loaded)
├── .claude/skills/docs.md     ← гайд обновления документации
└── .claude/skills/db.md       ← схема БД
```

### Корневой CLAUDE.md — обязательные секции

```markdown
# Project — Instructions

## Language
Communicate in Russian. Code comments, variable names, commit messages in English.

## Documentation Update Rule (MANDATORY)
After every code change, update relevant Writerside docs.
[таблица: условие → файл → действие]

## Write Operations — TDD Rule
1. Test first  2. Use transactions  3. Plan if >3 files

## Git Commit & Push
- Conventional Commits: feat:, fix:, docs:, refactor:, test:, chore:
- Include docs in same commit as code
- Suggest commit after task completion
- Never push without explicit approval

## Compaction
Preserve: modified files, test status, active task, pending TODOs

## References
- .claude/rules.md
- Sub-CLAUDE.md files
- .claude/skills/*.md
```

### Sub-CLAUDE.md — что включать

Для каждого суб-проекта (frontend, backend, web):
- **Stack** — версии, ключевые зависимости (1-2 строки)
- **Project Structure** — дерево директорий с назначением
- **API Client** — как делать запросы, авторизация
- **Naming Conventions** — файлы, компоненты, переменные
- **Styling** — подход (Tailwind, CSS-in-JS, etc.)
- **Corrections** — секция для накопления правил из фидбека

### `.claude/rules.md` — кросс-правила

- Security (секреты только в .env, валидация на сервере)
- Port mapping (какой порт что делает)
- Platform-specific files (проверять оба варианта при изменении)
- Corrections — накапливаются по мере работы, добавлять только с подтверждения пользователя

## 3. PostToolUse хуки

Три хука из `.claude/settings.local.json`, секция `hooks.PostToolUse`:

### typecheck-tsx.sh — TypeScript guard

```bash
# Matcher: Write|Edit|MultiEdit
# Фильтр: только .ts/.tsx, исключая backend и node_modules
# Логика:
#   1. npx tsc --noEmit --pretty false
#   2. Разделить реальные ошибки и unused vars (TS6133, TS6196)
#   3. Реальные ошибки → exit 1 (блокирует)
#   4. Только unused vars → warning, exit 0 (не блокирует)
```

### lint-python.sh — Python auto-fix

```bash
# Matcher: Write|Edit|MultiEdit
# Фильтр: только .py в backend/
# Логика:
#   1. ruff check --fix --quiet (auto-fix)
#   2. ruff format --quiet (форматирование)
#   3. Оставшиеся проблемы → warning
#   4. ВСЕГДА exit 0 — никогда не блокирует
# Fallback: если ruff не установлен локально → попробовать через Docker
```

### post-tool-call.py — Провенанс-трекинг

```python
# Matcher: Write|Edit|MultiEdit|NotebookEdit
# Универсальный, не зависит от стека
# Отправляет file_path + timestamp на localhost:PORT/api/provenance/call
# Порт вычисляется через MD5-хеш CLAUDE_PROJECT_DIR
# Тихо падает если сервер не запущен
```

### Настройка в settings.local.json

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|NotebookEdit",
        "hooks": [{ "type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-tool-call.py" }]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/typecheck-tsx.sh" }]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-python.sh" }]
      }
    ]
  }
}
```

> Хуки для Python-только проекта: убрать typecheck-tsx.sh.
> Хуки для TS-только проекта: убрать lint-python.sh.

## 4. Custom Slash Commands

Размещаются в `.claude/commands/<name>.md`. Доступны через `/<name>`.

### Рекомендуемый набор

| Команда | Назначение | Read-only? |
|---------|-----------|:----------:|
| `/status` | Git + TypeCheck + Docker healthcheck | Да |
| `/verify [scope]` | Проверка изменённых файлов (TS + lint + tests + security) | Да |
| `/test-backend [pattern]` | Запуск pytest в Docker | Да |
| `/build [platform]` | Expo/EAS build или typecheck | Да |
| `/start` | Старт сессии: dashboard + git log + docker | Да |
| `/gap-check` | Отчёт за день + промпт на завтра | Да |
| `/design-review [mode]` | UI/UX аудит через Playwright | Да |

### Шаблон команды

```markdown
Описание что делает команда.
Указать MUST NOT modify files если read-only.

Argument: $ARGUMENTS (описание)

## Steps
1. Что запустить (bash команды)
2. Что проанализировать

## Output format
Формат вывода (таблица, карточка, отчёт)
```

### Советы

- Все диагностические команды должны быть **read-only**
- Указывать абсолютные пути в bash-командах
- Ограничивать вывод (under 15/40 lines)
- `$ARGUMENTS` — аргументы, переданные пользователем

## 5. Skills

### Кастомные (`.claude/skills/*.md`)

Детальные гайды, загружаемые по запросу:

| Скилл | Содержание |
|-------|-----------|
| `writerside-docs.md` | Таблица: условие → файл для обновления, ADR формат, emoji-легенда, маппинг миграции |
| `payment-db.md` | Схема БД (таблицы, колонки, типы), FK chain, Docker-доступ, Aerich команды, бизнес-правила |

### Внешние скиллы — установка

```bash
# Vercel (React, RN, web design, deploy)
npx -y skills add vercel-labs/agent-skills -y

# Anthropic (frontend-design + dev tools)
npx -y skills add anthropics/claude-code -y

# UI/UX Pro Max (design system generator)
npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill -y

# UX Designer (WCAG, Nielsen, Laws of UX)
npx -y skills add szilu/ux-designer-skill -y

# Impeccable (21 design commands: /polish, /audit, /critique, etc.)
npx -y skills add pbakaus/impeccable -y
```

> Флаг `-y` обязателен для non-interactive установки.
> Скиллы устанавливаются в `.agents/skills/` и симлинкуются в `.claude/skills/`.

### Что даёт каждый источник

| Источник | Кол-во скиллов | Ключевые |
|----------|:--------------:|----------|
| Vercel | 7 | `web-design-guidelines`, `react-native-skills`, `react-best-practices` |
| Anthropic | 9 | `frontend-design`, `skill-development`, `hook-development` |
| UI/UX Pro Max | 7 | `ui-ux-pro-max` (дизайн-система), `ckm-design`, `ckm-brand` |
| UX Designer | 1 | `ux-designer` (24 reference-файла, 10700 строк) |
| Impeccable | 21 | `polish`, `audit`, `critique`, `typeset`, `colorize`, `overdrive` |

## 6. MCP серверы

### `.mcp.json` — шаблон

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres",
               "postgresql://USER:PASS@HOST:PORT/DB"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Permissions в settings.local.json

```json
{
  "permissions": {
    "allow": [
      "mcp__postgres__query",
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_type",
      "mcp__playwright__browser_tab_list",
      "mcp__playwright__browser_close",
      "mcp__context7__resolve-library-id",
      "mcp__context7__query-docs"
    ]
  }
}
```

> PostgreSQL MCP требует запущенный Docker с БД.
> Playwright MCP работает автономно (запускает Chromium).

## 7. Writerside

### Минимальный набор файлов

```
Writerside/
├── writerside.cfg          ← конфигурация (topics dir, images dir, instance)
├── ta.tree                 ← дерево навигации (TOC)
├── topics/
│   ├── landing.md          ← главная страница
│   ├── project-dashboard.md ← прогресс, next tasks (ОБНОВЛЯЕТСЯ КАЖДУЮ СЕССИЮ)
│   ├── project-overview.md ← архитектура
│   ├── decision-log.md     ← ADR записи
│   ├── dev-*.md            ← по одному на суб-проект
│   ├── api-*.md            ← API документация
│   ├── infra-*.md          ← Docker, CI/CD, Firebase
│   └── setup-*.md          ← гайды настройки окружения
└── images/                 ← скриншоты, диаграммы
```

### writerside.cfg

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ihp SYSTEM "https://resources.jetbrains.com/writerside/1.0/ihp.dtd">
<ihp version="2.0">
    <topics dir="topics"/>
    <images dir="images"/>
    <instance src="XX.tree" web-path="/project-docs"/>
</ihp>
```

### ta.tree — пример структуры

```xml
<instance-profile id="xx" name="ProjectName" start-page="landing.md">
    <toc-element topic="landing.md"/>
    <toc-element topic="project-dashboard.md"/>
    <toc-element toc-title="Section Name">
        <toc-element topic="topic-name.md"/>
    </toc-element>
</instance-profile>
```

## 8. Conventional Commits

Формат коммитов: `type: description`

| Type | Когда использовать |
|------|-------------------|
| `feat:` | Новая функциональность |
| `fix:` | Исправление бага |
| `docs:` | Только документация |
| `refactor:` | Рефакторинг без изменения поведения |
| `test:` | Добавление/изменение тестов |
| `chore:` | Сборка, конфигурация, зависимости |
| `style:` | Форматирование, без изменения логики |
| `perf:` | Оптимизация производительности |

Правила:
- Язык коммитов: **English**
- Документация включается в тот же коммит что и код
- После задачи — предложить коммит, но не пушить без подтверждения

## 9. agnix — валидация конфигурации

```bash
# Установка
npm install -g agnix

# Валидация всех конфигов Claude Code
agnix .

# Только safe auto-fix
agnix --fix-safe .

# Preview fixes
agnix --dry-run --show-fixes .
```

Что проверяет:
- Структура CLAUDE.md
- Формат settings.local.json
- Корректность commands/*.md
- Исполняемость hooks/*.sh
- Схема .mcp.json

> Ошибки во внешних скиллах (`.agents/skills/`) — нормально, они от авторов скиллов.

## 10. .gitignore

Добавить в `.gitignore`:

```gitignore
# Claude Code local settings (machine-specific absolute paths)
.claude/settings.local.json
```

НЕ игнорировать (должны быть в репозитории):
- `CLAUDE.md` (root и sub-files)
- `.claude/commands/`, `.claude/hooks/`, `.claude/skills/` (кастомные)
- `.claude/rules.md`
- `.mcp.json`
- `Writerside/`
- `skills-lock.json` (если есть)

## 11. Чеклист для нового проекта

- [ ] Создать `.claude/commands/`, `.claude/hooks/`, `.claude/skills/`
- [ ] Создать `Writerside/topics/`, `Writerside/images/`
- [ ] Написать `CLAUDE.md` (root) с Documentation Update Rule, TDD, Commits, Compaction
- [ ] Написать sub-CLAUDE.md для каждого суб-проекта
- [ ] Написать `.claude/rules.md` (security, ports, platform files)
- [ ] Создать хуки: `typecheck-tsx.sh`, `lint-python.sh`, `post-tool-call.py`
- [ ] Сделать хуки executable: `chmod +x .claude/hooks/*.sh`
- [ ] Создать `.claude/settings.local.json` (permissions + hooks)
- [ ] Создать `.mcp.json` (PostgreSQL + Playwright + Context7)
- [ ] Создать slash-команды: `/status`, `/verify`, `/test-backend`, `/build`, `/start`, `/gap-check`, `/design-review`
- [ ] Создать кастомные скиллы: `writerside-docs.md`, `<db-name>.md`
- [ ] Установить внешние скиллы: `npx -y skills add <source> -y`
- [ ] Создать Writerside: `writerside.cfg`, `*.tree`, скелетные топики
- [ ] Добавить `.claude/settings.local.json` в `.gitignore`
- [ ] Запустить `agnix .` для валидации
- [ ] Перезапустить Claude Code для подхвата конфигурации

## 12. Адаптация под стек

| Стек | Typecheck hook | Lint hook | MCP | Sub-CLAUDE |
|------|:-------------:|:---------:|:---:|:----------:|
| RN + Expo + TS | `tsc --noEmit` | — | Playwright | src/CLAUDE.md |
| Python + FastAPI/Litestar | — | `ruff check/format` | PostgreSQL | backend/CLAUDE.md |
| React + TS (web) | `tsc --noEmit` | — | Playwright | frontend/CLAUDE.md |
| Full-stack (все) | Оба | Оба | Все 3 | По одному на часть |

> Для Python-only проектов: убрать typecheck-tsx.sh из hooks, убрать Playwright из MCP.
> Для TS-only: убрать lint-python.sh, убрать PostgreSQL MCP если нет БД.
