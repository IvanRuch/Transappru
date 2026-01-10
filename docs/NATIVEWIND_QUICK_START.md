# NativeWind Quick Start

## 🚀 Быстрый старт

NativeWind установлен и настроен! Теперь можно использовать Tailwind классы в React Native компонентах.

## ⚡ Запуск приложения

```bash
# Очистите кеш и запустите
npx expo start -c
```

**Важно:** После установки NativeWind нужно перезапустить Metro bundler с очисткой кеша.

## 🎨 Первый компонент

```tsx
import { View, Text } from 'react-native';

export default function MyScreen() {
  return (
    <View className="flex-1 bg-dark-bg p-5">
      <Text className="text-lg font-bold text-text-primary">
        Привет, NativeWind!
      </Text>
    </View>
  );
}
```

## 🎯 Кастомные цвета проекта

### Темная тема (как ChargesScreen)

```tsx
// Фоны
className="bg-dark-bg"        // #2c2c2c - основной фон
className="bg-dark-surface"   // #3A3A3A - карточки, панели
className="bg-dark-elevated"  // #454545 - кнопки, выделенные элементы

// Текст
className="text-text-primary"    // #E8E8E8 - основной текст
className="text-text-secondary"  // #909090 - второстепенный текст

// Акценты
className="text-accent-primary"  // #C9A86B - золотой акцент
className="bg-accent-primary"    // #C9A86B - золотой фон

// Статусы
className="text-status-error"    // #EE505A - ошибки, ПЛАТОН
className="text-status-success"  // #40882C - успех
className="text-status-warning"  // #FFA500 - предупреждения
```

### Светлая тема (существующие экраны)

```tsx
className="bg-light-bg"       // #ffffff
className="bg-light-surface"  // #EEEEEE
className="text-text-dark"    // #313131
```

## 📖 Частые паттерны

### Контейнер экрана

```tsx
<SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
  {/* контент */}
</SafeAreaView>
```

### Карточка

```tsx
<View className="bg-dark-surface rounded-lg p-4 mx-5 mb-2.5">
  <Text className="text-base font-semibold text-text-primary">
    Заголовок карточки
  </Text>
</View>
```

### Кнопка

```tsx
<TouchableOpacity 
  className="bg-accent-primary rounded-lg py-3 px-6 items-center"
  onPress={handlePress}
>
  <Text className="text-base font-bold text-dark-bg">
    Нажми меня
  </Text>
</TouchableOpacity>
```

### Flex контейнер

```tsx
<View className="flex-row justify-between items-center px-5 py-2">
  <Text className="text-sm text-text-secondary">Слева</Text>
  <Text className="text-sm text-accent-primary">Справа</Text>
</View>
```

### Условные стили

```tsx
<View className={`p-4 rounded ${isActive ? 'bg-accent-primary' : 'bg-dark-surface'}`}>
  <Text className={`text-base ${isActive ? 'text-dark-bg' : 'text-text-primary'}`}>
    {isActive ? 'Активно' : 'Неактивно'}
  </Text>
</View>
```

### Динамические значения (используйте style)

```tsx
<View 
  className="absolute bottom-0 left-0 right-0 bg-dark-surface"
  style={{ paddingBottom: insets.bottom + 10 }}
>
  {/* контент */}
</View>
```

## 🔄 Миграция существующего экрана

1. **Найдите стили:**
   ```tsx
   const styles = StyleSheet.create({
     container: {
       flex: 1,
       backgroundColor: '#2c2c2c',
     },
   });
   ```

2. **Замените на className:**
   ```tsx
   // Было: style={styles.container}
   // Стало:
   className="flex-1 bg-dark-bg"
   ```

3. **Удалите StyleSheet.create()** в конце файла

4. **Проверьте работу**

## 📚 Полная документация

- `docs/NATIVEWIND_SETUP.md` - детальная документация
- `src/screens/charges/ChargesScreen.nativewind.example.tsx` - полный пример миграции

## 💡 Советы

1. **Начните с одного экрана** - например, ChargesScreen
2. **Используйте кастомные цвета** - они уже настроены в `tailwind.config.js`
3. **Смешивайте подходы** - NativeWind работает вместе со StyleSheet
4. **Проверяйте в hot reload** - изменения применяются мгновенно

## 🎉 Готово!

Теперь можете использовать NativeWind во всех компонентах проекта!
