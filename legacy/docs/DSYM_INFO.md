# dSYM Warnings в App Store Connect

## ⚠️ Предупреждения при загрузке

При загрузке архива в App Store Connect вы можете видеть предупреждения:

```
Upload Symbols Failed
The archive did not include a dSYM for the React.framework
The archive did not include a dSYM for the hermes.framework
The archive did not include a dSYM for the ReactNativeDependencies.framework
```

## ✅ Это нормально!

Эти предупреждения **не критичны** и **не блокируют публикацию** приложения.

### Почему это происходит?

1. **React Native frameworks** (React, Hermes, ReactNativeDependencies) компилируются без debug symbols
2. Эти frameworks поставляются как **pre-compiled binaries** без dSYM файлов
3. Для **вашего кода** dSYM генерируется корректно

### Что это значит для crash reporting?

- ✅ **Ваш код** будет полностью символизирован в crash reports
- ✅ **Stack traces вашего приложения** будут читаемыми
- ⚠️ **React Native framework код** будет показан как адреса памяти (но это редко нужно)

### Как убрать предупреждения? (опционально)

Если очень хочется убрать предупреждения, можно:

1. **Собрать React Native из исходников** (долго и сложно)
2. **Использовать EAS Build** от Expo (автоматически обрабатывает dSYM)
3. **Игнорировать** - это стандартная практика для React Native приложений

## 🎯 Рекомендация

**Просто игнорируйте эти предупреждения.** Они не влияют на:
- Публикацию в App Store
- Работу приложения
- Crash reporting вашего кода
- Производительность

App Store Connect принимает приложения с этими предупреждениями без проблем.

## 📚 Дополнительная информация

- [React Native dSYM Guide](https://reactnative.dev/docs/debugging#symbolication)
- [Expo Crash Reporting](https://docs.expo.dev/guides/using-sentry/)
- [Apple dSYM Documentation](https://developer.apple.com/documentation/xcode/building-your-app-to-include-debugging-information)
