# Решение проблемы Watchman на macOS Sequoia (15.x)

## Описание проблемы

На macOS Sequoia (Tahoe) Watchman не запускается из-за двух проблем:

1. **Двойной слэш в пути к сокету**: `TMPDIR` заканчивается на `/`, и Watchman добавляет еще один `/`, получается путь вида `/var/folders/.../T//grizodubov-state/sock`
2. **Низкий приоритет процесса (nice value = 5)**: Процессы, запущенные в фоне или из IDE, получают nice value = 5, а Watchman требует ≤ 0

### Симптомы:
```bash
watchman version
# Ошибка: unable to talk to your watchman on /var/folders/.../T//grizodubov-state/sock!
# Или: Connection refused
```

---

## Решение

### Шаг 1: Создать глобальный конфиг Watchman

Создайте файл `/etc/watchmanconfig` с разрешением работы при nice value до 10:

```bash
echo '{"min_acceptable_nice_value": 10}' | sudo tee /etc/watchmanconfig
```

**Пароль**: введите пароль администратора

---

### Шаг 2: Создать wrapper script для Watchman

Создайте директорию и wrapper script:

```bash
mkdir -p ~/.local/bin
```

Создайте файл `~/.local/bin/watchman` со следующим содержимым:

```bash
#!/bin/zsh
# Watchman wrapper to fix TMPDIR double slash issue and nice value

export TMPDIR="${TMPDIR%/}"
export WATCHMAN_CONFIG_FILE=/etc/watchmanconfig

SOCK_PATH="/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/sock"

# Check if server is running by checking socket file and process
if [ ! -S "$SOCK_PATH" ] || ! pgrep -u $(id -u) -f "watchman --foreground" > /dev/null 2>&1; then
    # Start server in background with config that allows nice=10
    mkdir -p "$(dirname "$SOCK_PATH")"
    WATCHMAN_CONFIG_FILE=/etc/watchmanconfig nohup /opt/homebrew/bin/watchman --foreground \
        --logfile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/log \
        --log-level=1 \
        --sockname="$SOCK_PATH" \
        --statefile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/state \
        --pidfile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/pid \
        >/dev/null 2>&1 &
    
    # Wait for socket to be created (up to 5 seconds)
    for i in {1..10}; do
        if [ -S "$SOCK_PATH" ]; then
            break
        fi
        sleep 0.5
    done
fi

# Execute watchman with correct socket path
exec /opt/homebrew/bin/watchman --sockname="$SOCK_PATH" "$@"
```

Сделайте файл исполняемым:

```bash
chmod +x ~/.local/bin/watchman
```

---

### Шаг 3: Обновить .zshrc

Добавьте в конец файла `~/.zshrc`:

```bash
# Fix Watchman TMPDIR double slash issue
export TMPDIR="${TMPDIR%/}"

# Add local bin to PATH (for watchman wrapper)
export PATH="$HOME/.local/bin:$PATH"

# Auto-start Watchman server in background if not running
if command -v watchman &> /dev/null; then
    SOCK_PATH="/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/sock"
    if [ ! -S "$SOCK_PATH" ] && ! pgrep -u $(id -u) watchman > /dev/null 2>&1; then
        # Start watchman server silently in background
        (WATCHMAN_CONFIG_FILE=/etc/watchmanconfig nohup /opt/homebrew/bin/watchman --foreground \
            --logfile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/log \
            --log-level=1 \
            --sockname="$SOCK_PATH" \
            --statefile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/state \
            --pidfile=/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/pid \
            >/dev/null 2>&1 &)
    fi
fi
```

Перезагрузите конфигурацию:

```bash
source ~/.zshrc
```

---

### Шаг 4: Создать .watchmanconfig в проекте (опционально)

В корне проекта создайте файл `.watchmanconfig`:

```json
{
  "min_acceptable_nice_value": 10
}
```

---

## Проверка

### Проверить версию Watchman:
```bash
watchman version
```

**Ожидаемый результат:**
```json
{
    "version": "HEAD-90b2084"
}
```

### Проверить запущенный процесс:
```bash
ps aux | grep watchman | grep -v grep
```

### Проверить время запуска (после остановки):
```bash
watchman shutdown-server
sleep 1
time watchman version
```

**Ожидаемое время:** ~0.1 секунды

---

## Как это работает

1. **Глобальный конфиг** `/etc/watchmanconfig` разрешает Watchman работать с nice value до 10
2. **Wrapper script** `~/.local/bin/watchman`:
   - Убирает trailing slash из `TMPDIR`
   - Указывает путь к конфигу через `WATCHMAN_CONFIG_FILE`
   - Проверяет наличие сервера без рекурсивного вызова
   - Автоматически запускает сервер при необходимости
   - Передает правильный путь к сокету (без двойного слэша)
3. **Автозапуск в .zshrc** запускает сервер при открытии первого терминала после перезагрузки

---

## Устранение проблем

### Watchman всё ещё не работает

1. Проверьте, что wrapper используется:
   ```bash
   which watchman
   # Должно быть: /Users/ваш_username/.local/bin/watchman
   ```

2. Проверьте права на wrapper:
   ```bash
   ls -la ~/.local/bin/watchman
   # Должно быть: -rwxr-xr-x
   ```

3. Проверьте логи:
   ```bash
   tail -50 /var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/log
   ```

### Медленный запуск

Если первый запуск после перезагрузки занимает ~1 минуту, это нормально - сервер запускается в первый раз. Последующие вызовы будут мгновенными.

Чтобы ускорить, откройте новый терминал - автозапуск из `.zshrc` запустит сервер в фоне.

### Конфликт с существующим Watchman

Если у вас уже запущен Watchman от root:
```bash
sudo killall watchman
```

---

## Дополнительная информация

- **Версия Watchman**: HEAD-90b2084 (установлена через Homebrew)
- **Путь к бинарнику**: `/opt/homebrew/bin/watchman`
- **Путь к сокету**: `/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/sock`
- **Логи**: `/var/folders/31/hky_xz4n58bb6mjsw4_b3s5r0000gn/T/grizodubov-state/log`

---

## Для React Native разработчиков

После настройки Watchman, Metro bundler будет работать корректно:

```bash
npm start
# или
yarn start
```

Metro автоматически обнаружит и использует Watchman для отслеживания изменений файлов.

---

## Автор решения

Решение разработано для проекта TransApp на macOS Sequoia 15.x (Tahoe).

Дата: 3 ноября 2025
