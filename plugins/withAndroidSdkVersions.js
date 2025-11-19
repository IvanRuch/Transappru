/* eslint-env node */
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Добавляет определение версий SDK в корневой build.gradle
 */
const withAndroidSdkVersions = (config) => {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Проверяем, не добавлено ли уже
    if (buildGradle.includes('buildToolsVersion =')) {
      return config;
    }

    // Добавляем ext блок с версиями SDK после buildscript {
    const extBlock = `  ext {
    buildToolsVersion = "35.0.0"
    minSdkVersion = 26
    compileSdkVersion = 35
    targetSdkVersion = 35
    ndkVersion = "28.0.12433566"

    kotlinVersion = "2.1.20"
  }
`;

    // Вставляем ext блок после "buildscript {"
    config.modResults.contents = buildGradle.replace(
      /buildscript\s*{/,
      `buildscript {\n${extBlock}`
    );

    // Также обновляем kotlin-gradle-plugin чтобы использовать переменную
    config.modResults.contents = config.modResults.contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/,
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
    );

    return config;
  });
};

module.exports = withAndroidSdkVersions;
