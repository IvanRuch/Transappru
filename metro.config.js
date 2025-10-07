const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { FileStore } = require('metro-cache');

// Определяем режим: релиз или отладка
const isRelease =
  process.env.NODE_ENV === 'production' ||
  process.argv.includes('bundle') ||
  process.argv.includes('release');

const defaultConfig = getDefaultConfig(__dirname);

// Локальный кэш всегда внутри проекта
const localCacheConfig = {
  cacheStores: [
    new FileStore({
      root: path.resolve(__dirname, '.metro-cache'),
    }),
  ],
  cacheVersion: '1.0',
};

module.exports = mergeConfig(
  defaultConfig,
  localCacheConfig
);
