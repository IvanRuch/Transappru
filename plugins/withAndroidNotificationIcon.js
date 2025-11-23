/* eslint-env node */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Настраивает кастомную иконку для Firebase push-уведомлений в Android
 * 
 * 1. Копирует иконки из assets/images/notification-icons/ во все density папки
 * 2. Добавляет meta-data в AndroidManifest.xml
 */
const withAndroidNotificationIcon = (config) => {
  // 1. Копируем иконки из assets
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidResPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res'
      );

      // Путь к иконкам в нашем проекте
      const iconsPath = path.join(projectRoot, 'assets/images/notification-icons');

      // Маппинг: density папка → имя файла
      const densityMap = {
        'drawable': 'ic_stat_ic_notification.png',
        'drawable-mdpi': 'ic_stat_ic_notification_mdpi.png',
        'drawable-hdpi': 'ic_stat_ic_notification_hdpi.png',
        'drawable-xhdpi': 'ic_stat_ic_notification_xhdpi.png',
        'drawable-xxhdpi': 'ic_stat_ic_notification_xxhdpi.png',
        'drawable-xxxhdpi': 'ic_stat_ic_notification_xxxhdpi.png',
      };
      
      let copiedCount = 0;
      
      for (const [density, fileName] of Object.entries(densityMap)) {
        const sourceIcon = path.join(iconsPath, fileName);
        const targetDir = path.join(androidResPath, density);
        const targetIcon = path.join(targetDir, 'ic_stat_ic_notification.png');

        if (fs.existsSync(sourceIcon)) {
          // Создаём целевую директорию если не существует
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // Копируем иконку
          fs.copyFileSync(sourceIcon, targetIcon);
          copiedCount++;
        }
      }

      if (copiedCount > 0) {
        console.log(`✅ Notification icons copied (${copiedCount} densities)`);
      } else {
        console.warn('⚠️  Notification icons not found in assets/images/notification-icons/');
      }

      return config;
    }
  ]);

  // 2. Добавляем meta-data в AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Инициализируем массив meta-data если отсутствует
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Проверяем, не добавлена ли уже иконка
    const notificationIconExists = application['meta-data'].some(
      (meta) => meta.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_icon'
    );

    if (!notificationIconExists) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_icon',
          'android:resource': '@drawable/ic_stat_ic_notification',
        },
      });
    }

    return config;
  });

  return config;
};

module.exports = withAndroidNotificationIcon;
