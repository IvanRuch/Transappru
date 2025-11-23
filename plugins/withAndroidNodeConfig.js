/* eslint-env node */
const { 
  withGradleProperties, 
  withDangerousMod 
} = require('@expo/config-plugins');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Определяет путь к Node.js в системе
 * @returns {string} Полный путь к node executable
 */
function detectNodePath() {
  try {
    const nodePath = execSync('which node', { encoding: 'utf-8' }).trim();
    return nodePath;
  } catch (error) {
    console.warn('⚠️  Could not detect node path, using default');
    return '/usr/local/bin/node';
  }
}

/**
 * Комплексный плагин для настройки Node.js путей в Android проекте
 * Решает проблему "Cannot run program 'node'" при сборке с NVM
 * 
 * Выполняет:
 * 1. Добавляет node path в gradle.properties
 * 2. Патчит settings.gradle
 * 3. Патчит expo-modules-autolinking исходники
 */
const withAndroidNodeConfig = (config) => {
  // Определяем путь к Node один раз
  const nodePath = detectNodePath();
  
  // Выводим сообщение только если это первый вызов
  if (!process.env.NODE_PATH_LOGGED) {
    console.log(`📍 Node.js path: ${nodePath}`);
    process.env.NODE_PATH_LOGGED = 'true';
  }

  // 1. Настраиваем gradle.properties
  config = withGradleProperties(config, (config) => {
    const properties = [
      { key: 'react.nodeExecutableAndArgs', comment: 'Node path for React Native' },
      { key: 'expo.nodeExecutableAndArgs', comment: 'Node path for Expo autolinking' }
    ];

    properties.forEach(({ key, comment }) => {
      const existingIndex = config.modResults.findIndex(
        item => item.type === 'property' && item.key === key
      );

      if (existingIndex >= 0) {
        config.modResults[existingIndex].value = nodePath;
      } else {
        config.modResults.push({
          type: 'comment',
          value: comment,
        });
        config.modResults.push({
          type: 'property',
          key,
          value: nodePath,
        });
      }
    });

    return config;
  });

  // 2. Патчим settings.gradle
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const settingsGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'settings.gradle'
      );

      if (fs.existsSync(settingsGradlePath)) {
        let content = fs.readFileSync(settingsGradlePath, 'utf-8');
        const originalContent = content;
        
        // Заменяем все вхождения commandLine("node" на полный путь
        content = content.replace(
          /commandLine\("node"/g,
          `commandLine("${nodePath}"`
        );

        if (content !== originalContent) {
          fs.writeFileSync(settingsGradlePath, content, 'utf-8');
          if (!process.env.NODE_CONFIG_LOGGED) {
            console.log('✅ Android Node.js configuration applied');
            process.env.NODE_CONFIG_LOGGED = 'true';
          }
        }
      }

      return config;
    }
  ]);

  // 3. Патчим expo-modules-autolinking исходники
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        let patchCount = 0;
        
        // Патчим Kotlin plugin
        const expoPkg = require.resolve('expo-modules-autolinking/package.json');
        const expoRoot = path.dirname(expoPkg);
        const kotlinFile = path.join(
          expoRoot,
          'android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsPlugin.kt'
        );

        if (fs.existsSync(kotlinFile)) {
          let src = fs.readFileSync(kotlinFile, 'utf-8');
          const replaced = src.replace(/commandLine\("node"/g, `commandLine("${nodePath}"`);
          
          if (replaced !== src) {
            fs.writeFileSync(kotlinFile, replaced, 'utf-8');
            patchCount++;
          }
        }

        // Патчим autolinking_implementation.gradle
        const implFile = require.resolve('expo-modules-autolinking/scripts/android/autolinking_implementation.gradle');
        
        if (fs.existsSync(implFile)) {
          let src = fs.readFileSync(implFile, 'utf-8');
          const replaced = src.replace(/\n\s*'node',/g, `\n      '${nodePath}',`);
          
          if (replaced !== src) {
            fs.writeFileSync(implFile, replaced, 'utf-8');
            patchCount++;
          }
        }
        
        // Выводим сообщение только если были изменения
        if (patchCount > 0 && !process.env.EXPO_AUTOLINKING_PATCHED) {
          console.log(`✅ Expo autolinking patched (${patchCount} files)`);
          process.env.EXPO_AUTOLINKING_PATCHED = 'true';
        }
      } catch (error) {
        console.warn('⚠️  Failed to patch expo-modules-autolinking:', error.message);
      }

      return config;
    }
  ]);

  return config;
};

module.exports = withAndroidNodeConfig;
