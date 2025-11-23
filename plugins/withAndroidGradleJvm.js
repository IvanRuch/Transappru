/* eslint-env node */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * ОТКЛЮЧЁН: Настройка Gradle JVM в .idea/gradle.xml
 * 
 * Этот плагин создавал gradle.xml, что приводило к переключению IntelliJ IDEA
 * в Android-режим и нарушало отображение Expo проекта.
 * 
 * Решение: Открывайте Android часть отдельно в Android Studio, если нужно.
 * Основной проект должен оставаться в Expo/React Native режиме.
 * 
 * ВАЖНО: Плагин оставлен для совместимости, но ничего не делает.
 */
module.exports = function withAndroidGradleJvm(config) {
  // Плагин отключён - не создаём gradle.xml чтобы не конфликтовать с IDE
  console.log('ℹ️  withAndroidGradleJvm: disabled to preserve Expo project view');
  return config;
};
