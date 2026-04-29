/* eslint-env node */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Создаёт splashscreen_logo drawable для Android 12+ Splash Screen API
 * Копирует splash.png из assets/images в drawable папку
 */
const withAndroidSplashScreen = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidResPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res'
      );

      // Путь к исходному splash.png
      const sourceSplashPath = path.join(projectRoot, 'assets/images/splash.png');
      
      // Создаём drawable директорию если не существует
      const drawablePath = path.join(androidResPath, 'drawable');
      if (!fs.existsSync(drawablePath)) {
        fs.mkdirSync(drawablePath, { recursive: true });
      }

      // Путь к целевому файлу
      const targetLogoPath = path.join(drawablePath, 'splashscreen_logo.png');

      // Копируем splash.png как splashscreen_logo.png
      if (fs.existsSync(sourceSplashPath)) {
        fs.copyFileSync(sourceSplashPath, targetLogoPath);
        console.log('✅ Splash screen logo created');
      } else {
        console.warn('⚠️  assets/images/splash.png not found, splash screen may not work');
      }

      return config;
    }
  ]);
};

module.exports = withAndroidSplashScreen;
