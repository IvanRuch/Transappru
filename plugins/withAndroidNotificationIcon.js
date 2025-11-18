/* eslint-env node */
// @expo/config-plugins is in devDependencies
const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Добавляет кастомную иконку для push-уведомлений в Android
 * Иконка должна быть в res/drawable/ic_stat_ic_notification.png
 */
const withAndroidNotificationIcon = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Проверяем есть ли уже meta-data для иконки уведомлений
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const notificationIconExists = application['meta-data'].some(
      (meta) => meta.$['android:name'] === 'com.google.firebase.messaging.default_notification_icon'
    );

    if (!notificationIconExists) {
      // Добавляем meta-data для кастомной иконки уведомлений
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_icon',
          'android:resource': '@drawable/ic_stat_ic_notification',
        },
      });
      console.log('✅ Android notification icon configured');
    }

    return config;
  });
};

module.exports = withAndroidNotificationIcon;
