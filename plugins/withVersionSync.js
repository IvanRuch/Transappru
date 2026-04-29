/* eslint-env node */
const { withXcodeProject, withInfoPlist } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Синхронизирует версии из package.json с iOS и Android
 */
const withVersionSync = (config) => {
  // Читаем версию из package.json
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  
  // Генерируем versionCode для Android (major*10000 + minor*100 + patch)
  const parts = version.split('.');
  const major = parseInt(parts[0] || 0);
  const minor = parseInt(parts[1] || 0);
  const patch = parseInt(parts[2] || 0);
  const versionCode = major * 10000 + minor * 100 + patch;
  
  // Устанавливаем версии в config
  config.version = version;
  
  if (!config.ios) config.ios = {};
  config.ios.buildNumber = '1'; // iOS Build всегда 1 (как в старом проекте)
  
  if (!config.android) config.android = {};
  config.android.versionCode = versionCode;
  
  // Выводим сообщение только если это не повторный вызов
  if (!process.env.VERSION_SYNC_LOGGED) {
    console.log(`📦 Version sync: ${version} (iOS build: 1, Android versionCode: ${versionCode})`);
    process.env.VERSION_SYNC_LOGGED = 'true';
  }
  
  // Применяем к iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleShortVersionString = version;
    config.modResults.CFBundleVersion = '1';
    return config;
  });
  
  // Применяем к Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    Object.keys(xcodeProject.pbxNativeTargetSection()).forEach((key) => {
      if (key.endsWith('_comment')) return;
      
      const target = xcodeProject.pbxNativeTargetSection()[key];
      if (target && target.name) {
        const buildConfigurationList = target.buildConfigurationList;
        const buildConfigurations = xcodeProject.pbxXCConfigurationList()[buildConfigurationList];
        
        if (buildConfigurations && buildConfigurations.buildConfigurations) {
          buildConfigurations.buildConfigurations.forEach((configId) => {
            const buildConfig = xcodeProject.pbxXCBuildConfigurationSection()[configId.value];
            if (buildConfig && buildConfig.buildSettings) {
              buildConfig.buildSettings.MARKETING_VERSION = version;
              buildConfig.buildSettings.CURRENT_PROJECT_VERSION = '1';
            }
          });
        }
      }
    });
    
    return config;
  });
  
  return config;
};

module.exports = withVersionSync;
