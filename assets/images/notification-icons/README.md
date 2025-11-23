# Android Push Notification Icons

Эта папка содержит иконки для push-уведомлений Android в разных разрешениях (densities).

## Файлы:

- `ic_stat_ic_notification.png` - базовая версия (drawable)
- `ic_stat_ic_notification_mdpi.png` - MDPI (48x48 dp)
- `ic_stat_ic_notification_hdpi.png` - HDPI (72x72 dp)
- `ic_stat_ic_notification_xhdpi.png` - XHDPI (96x96 dp)
- `ic_stat_ic_notification_xxhdpi.png` - XXHDPI (144x144 dp)
- `ic_stat_ic_notification_xxxhdpi.png` - XXXHDPI (192x192 dp)

## Использование:

Эти иконки автоматически копируются в соответствующие `drawable-*` папки Android проекта при запуске `expo prebuild` через плагин `plugins/withAndroidNotificationIcon.js`.

## Требования к иконке:

1. **Формат:** PNG с прозрачностью
2. **Цвет:** Белый на прозрачном фоне (Android автоматически применит цвет темы)
3. **Стиль:** Простая, плоская иконка (flat icon)
4. **Размеры:**
   - MDPI: 24x24 dp (48x48 px @ 2x)
   - HDPI: 36x36 dp (72x72 px @ 2x)
   - XHDPI: 48x48 dp (96x96 px @ 2x)
   - XXHDPI: 72x72 dp (144x144 px @ 2x)
   - XXXHDPI: 96x96 dp (192x192 px @ 2x)

## Как обновить иконку:

1. Создайте новую иконку в соответствии с требованиями выше
2. Экспортируйте в разных разрешениях
3. Замените файлы в этой папке
4. Запустите `npx expo prebuild --clean`

## Ссылки:

- [Android Notification Icons Guidelines](https://developer.android.com/develop/ui/views/notifications/custom-notification#CustomNotificationText)
- [Material Design Icons](https://fonts.google.com/icons)
