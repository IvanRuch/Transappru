/* eslint-env node */
// Use expo/config-plugins (sub-export of expo) — Expo deprecates direct @expo/config-plugins install
const { withXcodeProject, withInfoPlist } = require('expo/config-plugins');

/**
 * Настраивает Destinations для iOS проекта (только iPhone, без iPad, Apple Watch, Apple TV, Vision Pro)
 */
const withDestinations = (config) => {
  // Настраиваем Info.plist
  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;
    
    // Убираем поддержку iPad
    plist.UIDeviceFamily = [1]; // 1 = iPhone only (2 = iPad)
    
    // Отключаем поддержку других платформ
    plist.UISupportedInterfaceOrientations = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown'
    ];
    
    return config;
  });
  
  // Настраиваем Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    
    // @ts-ignore - xcodeProject методы из xcode library
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
              // Только iPhone (не iPad)
              buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
              
              // Отключаем Mac Catalyst
              buildConfig.buildSettings.SUPPORTS_MACCATALYST = 'NO';
              
              // Отключаем Vision Pro (visionOS) - все возможные ключи
              buildConfig.buildSettings.SUPPORTS_XR = 'NO';
              buildConfig.buildSettings.SUPPORTS_VISIONOS = 'NO';
              buildConfig.buildSettings['SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD'] = 'NO';
              
              // Только iOS платформы (явно указываем)
              buildConfig.buildSettings.SUPPORTED_PLATFORMS = '"iphoneos iphonesimulator"';
              buildConfig.buildSettings.SDKROOT = 'iphoneos';
              
              // Убираем все deployment targets кроме iOS
              delete buildConfig.buildSettings.WATCHOS_DEPLOYMENT_TARGET;
              delete buildConfig.buildSettings.TVOS_DEPLOYMENT_TARGET;
              delete buildConfig.buildSettings.XROS_DEPLOYMENT_TARGET;
              delete buildConfig.buildSettings.VISIONOS_DEPLOYMENT_TARGET;
              delete buildConfig.buildSettings.MACOSX_DEPLOYMENT_TARGET;
            }
          });
        }
      }
    });
    
    return config;
  });
  
  return config;
};

module.exports = withDestinations;
