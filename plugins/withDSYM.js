/* eslint-env node */
// @expo/config-plugins is in devDependencies
const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Включает генерацию dSYM файлов для production builds
 * dSYM файлы нужны для символикации crash reports в App Store Connect
 * 
 * Примечание: React Native frameworks (React, Hermes) могут не иметь dSYM,
 * это нормально и не влияет на crash reporting вашего кода
 */
const withDSYM = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    // @ts-ignore - xcodeProject методы из xcode library
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in configurations) {
      if (key.endsWith('_comment')) continue;
      
      const buildConfig = configurations[key];
      
      // Включаем dSYM для Release конфигурации
      if (buildConfig.name === 'Release') {
        // DEBUG_INFORMATION_FORMAT = dwarf-with-dsym включает генерацию dSYM
        buildConfig.buildSettings.DEBUG_INFORMATION_FORMAT = 'dwarf-with-dsym';
        
        // Убеждаемся что символы не стрипятся полностью
        buildConfig.buildSettings.COPY_PHASE_STRIP = 'NO';
        buildConfig.buildSettings.STRIP_INSTALLED_PRODUCT = 'YES';
        
        // Сохраняем символы для crash reporting
        buildConfig.buildSettings.STRIP_STYLE = 'non-global';
        
        // Включаем Bitcode (если нужно для старых версий iOS)
        // buildConfig.buildSettings.ENABLE_BITCODE = 'YES';
        
        // Генерируем dSYM для всех архитектур
        buildConfig.buildSettings.ONLY_ACTIVE_ARCH = 'NO';
        
        console.log('✅ dSYM enabled for Release configuration');
      }
    }

    return config;
  });
};

module.exports = withDSYM;
