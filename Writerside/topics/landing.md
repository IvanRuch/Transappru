# TransApp Documentation

TransApp — мобильное приложение для управления автомобилями, оплаты штрафов и взаимодействия с государственными сервисами.

## Разделы

- **[Project Dashboard](project-dashboard.md)** — текущий прогресс и следующие задачи
- **[Project Overview](project-overview.md)** — архитектура и стек
- **[Mobile App](dev-mobile.md)** — разработка RN/Expo приложения
- **[Payment Service](api-payment.md)** — API платёжного сервиса
- **[Web](dev-web.md)** — веб-версия
- **[Infrastructure](infra-docker.md)** — Docker, EAS, Firebase
- **[Setup Guides](setup-android.md)** — настройка окружения

## Стек

| Компонент | Технологии |
|-----------|-----------|
| Mobile | React Native 0.81 + Expo 54 + TypeScript + NativeWind |
| Payment Service | Python (Litestar + Tortoise ORM + PostgreSQL 15) |
| Web | Expo Web (тот же кодбейс, см. ADR-001) |
| Maps | Yandex Maps JS API v3 (web), `react-native-yamap-plus` (native) |
| Push | Firebase Cloud Messaging |
| Build | EAS (Expo Application Services) |

## Guides

- **[Claude Code Setup Guide](guide-claude-code-setup.md)** — пошаговая инструкция настройки Claude Code для проектов
