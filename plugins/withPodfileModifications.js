const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Кастомный плагин для модификации Podfile
 * Добавляет use_modular_headers! для совместимости Firebase с YandexMaps
 */
module.exports = function withPodfileModifications(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      try {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
        
        // Проверяем, не добавлено ли уже
        if (podfileContent.includes('use_modular_headers!')) {
          console.log('✅ Podfile уже содержит use_modular_headers!');
          return config;
        }
        
        // Добавляем use_modular_headers! после platform :ios
        podfileContent = podfileContent.replace(
          /(platform :ios.*)/,
          '$1\n\n# Enable modular headers for Firebase compatibility\nuse_modular_headers!'
        );
        
        fs.writeFileSync(podfilePath, podfileContent, 'utf-8');
        console.log('✅ Добавлено use_modular_headers! в Podfile');
      } catch (error) {
        console.error('❌ Ошибка при модификации Podfile:', error);
      }
      
      return config;
    },
  ]);
};
