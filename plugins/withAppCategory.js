/* eslint-env node */
const { withXcodeProject } = require('expo/config-plugins');

/**
 * Настраивает App Category для iOS проекта
 */
const withAppCategory = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    
    // Находим все targets и настраиваем App Category
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
              // Устанавливаем App Category - Business
              buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '"org.reactjs.native.example.Transappru"';
              buildConfig.buildSettings.INFOPLIST_KEY_LSApplicationCategoryType = '"public.app-category.business"';
            }
          });
        }
      }
    });
    
    return config;
  });
};

module.exports = withAppCategory;
