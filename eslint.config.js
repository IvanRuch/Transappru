// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Отключаем предупреждение об неиспользуемых экспортах в файлах роутинга
    // Expo Router автоматически использует default export из файлов app/
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      // Отключаем все варианты проверки неиспользуемых экспортов
      'import/no-unused-modules': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'off',
    },
  },
]);
