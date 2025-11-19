# TODO List

## 🔔 Уведомления
- [ ] **Настройки типов уведомлений**
  - Добавить экран настроек уведомлений в профиле пользователя
  - Клиент должен иметь возможность выбирать типы уведомлений, которые он будет получать:
    - Штрафы
    - Пропуска
    - ОСАГО
    - Диагностическая карта
    - Автодор
    - РНИС
    - Общие уведомления
  - Сохранять настройки на сервере
  - API endpoint для получения/сохранения настроек уведомлений

## 🚗 Функционал (не критично)
- [ ] **Экран AutoDriver** - назначение водителей на автомобили (незавершенный функционал в старом проекте)
- [ ] **Background handler для push-уведомлений** - обработка уведомлений в фоновом режиме (дополнительная оптимизация)

## 🔧 Технический долг
- [x] **Firebase Messaging v23** - используется через messaging() (deprecation warnings неизбежны до v22, но API стабильный)
- [x] **Включить dSYM для production** - добавлен плагин withDSYM.js для crash reporting в App Store
- [x] **Настройка иконки Android уведомлений** - скопированы иконки и добавлен плагин withAndroidNotificationIcon.js
- [x] **Улучшен Splash Screen** - создан LaunchScreen.storyboard с текстом "TransApp", убраны задержки, быстрая загрузка
- [x] **Node path для Android Studio** - добавлены плагины withNodePath.js, withAndroidNodePath.js и withPatchExpoAutolinkingNode.js для автоопределения пути к Node (решает проблему NVM). Также создан ~/.zshenv для GUI приложений
- [x] **Android Gradle Plugin версия** - настроена автоматическая версия AGP 8.13.1 через expo-build-properties в app.json
- [x] **Gradle JVM настройка** - добавлен плагин withAndroidGradleJvm.js для автоматической настройки JBR-21 в .idea/gradle.xml (убирает предупреждение "Undefined java.home")
- [x] **Document Picker** - заменен react-native-document-picker на expo-document-picker для совместимости с React Native 0.81
- [x] **FlatList onEndReached** - исправлена автоподгрузка списка авто: добавлены проверки на загрузку и наличие данных, убрана избыточная логика с momentum

## ✅ Выполнено
- [x] ...
