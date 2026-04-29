const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Автоматически устанавливает aps-environment в зависимости от профиля сборки
 * Development/Preview → development
 * Production → production
 */
module.exports = function withAPSEnvironment(config) {
  return withEntitlementsPlist(config, (config) => {
    // Определяем режим из переменных окружения
    const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';
    const isProduction = buildProfile === 'production';
    
    // Устанавливаем правильное значение
    config.modResults['aps-environment'] = isProduction ? 'production' : 'development';
    
    console.log(`✅ aps-environment установлен в: ${config.modResults['aps-environment']}`);
    
    return config;
  });
};
