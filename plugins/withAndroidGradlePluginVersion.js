/* eslint-env node */
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to explicitly set Android Gradle Plugin version in build.gradle
 * This ensures Android Studio sees the correct AGP version
 */
module.exports = function withAndroidGradlePluginVersion(config, { version = '8.12.0' } = {}) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Replace the AGP classpath to include explicit version
    const agpPattern = /classpath\(['"]com\.android\.tools\.build:gradle(?::[^'"]+)?['"]\)/;
    
    if (agpPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        agpPattern,
        `classpath('com.android.tools.build:gradle:${version}')`
      );
      console.log(`✅ Set AGP version to ${version} in build.gradle`);
    } else {
      console.log('ℹ️  AGP classpath pattern not found in build.gradle');
    }

    return config;
  });
};
