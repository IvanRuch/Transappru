# Safe Area Solution для Android

## Проблема
На устройствах Android с навигационной панелью (особенно MIUI, One UI и др.) элементы с `position: absolute, bottom: X` уходят за экран, так как не учитывают высоту системной навигационной панели.

## Решение

### 1. Для функциональных компонентов
Используйте хук `useSafeAreaInsets()`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyScreen() {
  const { bottom: bottomInset } = useSafeAreaInsets();
  
  return (
    <View style={[styles.bottomMenu, { paddingBottom: Math.max(bottomInset, 10) }]}>
      {/* content */}
    </View>
  );
}
```

### 2. Для классовых компонентов
Используйте `SafeAreaInsetsContext.Consumer`:

```tsx
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

class MyScreen extends React.Component {
  render() {
    return (
      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <TouchableHighlight
            style={{ 
              position: 'absolute',
              bottom: Math.max(insets?.bottom || 0, 10),
              // ... other styles
            }}
          >
            <Text>Button</Text>
          </TouchableHighlight>
        )}
      </SafeAreaInsetsContext.Consumer>
    );
  }
}
```

### 3. Переиспользуемый компонент (рекомендуется)
Используйте готовый компонент `SafeBottomButton`:

```tsx
import { SafeBottomButton } from '../../components/common';

// В функциональном компоненте
<SafeBottomButton
  title="Заказать пропуск"
  onPress={handlePress}
  backgroundColor="#3A3A3A"
  textColor="#FFFFFF"
/>
```

## Исправленные экраны

✅ **FindAutoPanel** - модалка фильтра авто  
✅ **AutoListScreen** - нижнее меню  
✅ **PassScreen** - кнопка "Заказать пропуск"  
✅ **PassYaMapScreen** - кнопка "Добавить" на карте  
✅ **AutoDetailScreen** - кнопка "Заказать пропуск"  
✅ **LeftMenuModal** - статус организаций  

## Формула расчёта отступа

```tsx
bottom: Math.max(insets?.bottom || 0, minValue)
```

- `insets.bottom` - высота навигационной панели Android (обычно 0-48px)
- `minValue` - минимальный отступ для устройств без панели (обычно 10-20px)

## Для FlatList с нижним меню

```tsx
contentContainerStyle={{ 
  paddingBottom: menuHeight + Math.max(bottomInset, 10) + extraSpace
}}
```

Где:
- `menuHeight` - высота меню (например, 80px)
- `bottomInset` - высота навигационной панели
- `extraSpace` - дополнительный зазор (например, 20px)

## Компоненты

### SafeBottomButton
`src/components/common/SafeBottomButton.tsx`

Готовый компонент для кнопок, прижатых к низу экрана.

**Props:**
- `title: string` - текст кнопки
- `onPress: () => void` - обработчик нажатия
- `backgroundColor?: string` - цвет фона (по умолчанию `#3A3A3A`)
- `textColor?: string` - цвет текста (по умолчанию `#FFFFFF`)
- `disabled?: boolean` - отключить кнопку
- `style?: ViewStyle` - дополнительные стили
- `textStyle?: TextStyle` - стили текста

### withSafeAreaInsets HOC
`src/components/common/withSafeAreaInsets.tsx`

HOC для добавления `insets` в props классовых компонентов (если понадобится в будущем).

## Тестирование

Тестируйте на:
- Устройствах с навигационной панелью (Poco, Samsung, Xiaomi)
- Эмуляторе Android 10+ с включённой 3-button navigation
- Устройствах без навигационной панели (gesture navigation)
