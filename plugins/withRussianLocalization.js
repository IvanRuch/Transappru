const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Добавляет русскую локализацию для iOS приложения
 */
const withRussianLocalization = (config) => {
  // Настраиваем Info.plist для русского языка
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleDevelopmentRegion = 'ru';
    config.modResults.CFBundleAllowMixedLocalizations = true;
    return config;
  });

  // Добавляем файлы локализации и настраиваем Xcode проект
  config = withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios', config.modRequest.projectName);
    
    // Создаем папку для русской локализации
    const ruLprojPath = path.join(iosPath, 'ru.lproj');
    if (!fs.existsSync(ruLprojPath)) {
      fs.mkdirSync(ruLprojPath, { recursive: true });
    }

    // Создаем InfoPlist.strings для русского языка
    const infoPlistStrings = `/* Localized versions of Info.plist keys */

"CFBundleDisplayName" = "TransApp";
"NSLocationWhenInUseUsageDescription" = "Приложение использует вашу геолокацию для отображения на карте";
"NSLocationAlwaysUsageDescription" = "Приложение использует вашу геолокацию для отображения на карте";
`;

    const infoPlistStringsPath = path.join(ruLprojPath, 'InfoPlist.strings');
    fs.writeFileSync(infoPlistStringsPath, infoPlistStrings, 'utf8');

    // Добавляем русский язык в knownRegions проекта
    const project = config.modResults;
    const projectSection = project.pbxProjectSection();
    const projectUuid = Object.keys(projectSection)[0];
    const projectObject = projectSection[projectUuid];
    
    if (projectObject && projectObject.knownRegions) {
      if (!projectObject.knownRegions.includes('ru')) {
        projectObject.knownRegions.push('ru');
        console.log('✅ Добавлен русский язык в knownRegions');
      }
    }

    console.log('✅ Русская локализация добавлена');

    return config;
  });

  return config;
};

module.exports = withRussianLocalization;
