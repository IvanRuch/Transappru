/* eslint-env node */
// Use expo/config-plugins (sub-export of expo) — Expo deprecates direct @expo/config-plugins install
const { withInfoPlist } = require('expo/config-plugins');

/**
 * Добавляет Background Modes для push-уведомлений и background fetch
 */
const withBackgroundModes = (config) => {
  // Добавляем Background Modes в Info.plist
  config = withInfoPlist(config, (config) => {
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const backgroundModes = config.modResults.UIBackgroundModes;
    
    // Background fetch
    if (!backgroundModes.includes('fetch')) {
      backgroundModes.push('fetch');
    }
    
    // Remote notifications
    if (!backgroundModes.includes('remote-notification')) {
      backgroundModes.push('remote-notification');
    }
    
    config.modResults.UIBackgroundModes = backgroundModes;
    
    return config;
  });
  
  return config;
};

module.exports = withBackgroundModes;
