/* eslint-env node */
const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Исправляет различные настройки в AndroidManifest.xml
 * 
 * 1. Включает enableOnBackInvokedCallback для Android 13+ (API 33+)
 * 2. Включает usesCleartextTraffic для разработки (HTTP запросы)
 * 3. Добавляет разрешение AD_ID для Google Play Console
 */
const withAndroidManifestFixes = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    if (!application.$) {
      application.$ = {};
    }

    // Включаем enableOnBackInvokedCallback для правильной работы back navigation
    // https://developer.android.com/about/versions/13/features/predictive-back-gesture
    application.$['android:enableOnBackInvokedCallback'] = 'true';

    // Разрешаем HTTP трафик для разработки (localhost, эмулятор)
    // ВАЖНО: Удалите это для production или используйте network_security_config.xml
    if (process.env.NODE_ENV !== 'production') {
      application.$['android:usesCleartextTraffic'] = 'true';
    }

    // Добавляем разрешение AD_ID для Google Play Console
    // Требуется для корректной работы с advertising ID
    // https://support.google.com/googleplay/android-developer/answer/6048248
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    const adIdPermission = {
      $: {
        'android:name': 'com.google.android.gms.permission.AD_ID'
      }
    };
    
    // Проверяем, не добавлено ли уже это разрешение
    const hasAdIdPermission = androidManifest.manifest['uses-permission'].some(
      permission => permission.$['android:name'] === 'com.google.android.gms.permission.AD_ID'
    );
    
    if (!hasAdIdPermission) {
      androidManifest.manifest['uses-permission'].push(adIdPermission);
      console.log('✅ Added AD_ID permission to AndroidManifest');
    }

    console.log('✅ AndroidManifest configured');

    return config;
  });
};

module.exports = withAndroidManifestFixes;
