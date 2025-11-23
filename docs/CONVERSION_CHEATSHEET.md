# Шпаргалка по конвертации в TypeScript

## Быстрая конвертация экрана

### 1. Импорты

```typescript
// ❌ Старый
import React from 'react';
import Api from "./utils/Api";
import { getFCMToken } from './utils/PushNotificationHelper';

// ✅ Новый
import React, { Component } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { FirebaseService } from '../../services/firebase';
import { RootStackParamList } from '../../types/navigation';
```

### 2. Типы для компонента

```typescript
// Добавьте перед классом
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScreenName'>;

interface ScreenProps {
  navigation: ScreenNavigationProp;
  route?: any; // Если есть параметры
}

interface ScreenState {
  // Скопируйте из this.state
  data: any;
  loading: boolean;
}
```

### 3. Класс компонента

```typescript
// ❌ Старый
class MyScreen extends React.Component {
  constructor(props) {
    super(props);

// ✅ Новый
class MyScreen extends Component<ScreenProps, ScreenState> {
  constructor(props: ScreenProps) {
    super(props);
```

### 4. Методы с типами

```typescript
// ❌ Старый
changeValue = (value) => {
  this.setState({value: value})
}

// ✅ Новый
changeValue = (value: string): void => {
  this.setState({value: value})
}
```

### 5. API вызовы

```typescript
// ❌ Старый
Api.post('/endpoint', { data })
  .then(res => {
    const data = res.data;
    this.setState({ data });
  })
  .catch(error => {
    console.log(error);
  });

// ✅ Новый
try {
  const res = await api.post('/endpoint', { data });
  const data = res.data;
  this.setState({ data });
} catch (error) {
  console.log(error);
}
```

### 6. Сравнения

```typescript
// ❌ Старый
if (value == 1)
if (typeof(data) != 'undefined')

// ✅ Новый
if (value === 1)
if (typeof(data) !== 'undefined')
```

### 7. Пути к изображениям

```typescript
// ❌ Старый
require('../images/icon.png')

// ✅ Новый
require('../../../assets/images/icon.png')

// Правило: считайте уровни вложенности
// src/screens/auth/Screen.tsx → assets/images/
// 3 уровня вверх: ../../../
```

### 8. AsyncStorage

```typescript
// ❌ Старый
AsyncStorage.getItem('token').then((value) => this.doSomething(value));

// ✅ Новый
const token = await AsyncStorage.getItem('token');
this.doSomething(token);
```

### 9. componentDidMount

```typescript
// ❌ Старый
componentDidMount() {
  Api.post('/data')
    .then(res => this.setState({ data: res.data }))
}

// ✅ Новый
async componentDidMount() {
  try {
    const res = await api.post('/data');
    this.setState({ data: res.data });
  } catch (error) {
    console.log(error);
  }
}
```

### 10. Firebase

```typescript
// ❌ Старый
import { getFCMToken } from './utils/PushNotificationHelper';
getFCMToken();

// ✅ Новый
import { FirebaseService } from '../../services/firebase';
await FirebaseService.getToken();
```

## Пример полной конвертации

### Было (OldScreen.js):
```javascript
import React from 'react';
import { View, Text } from 'react-native';
import Api from "./utils/Api";

class OldScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
    };
  }

  loadData = (id) => {
    Api.post('/get-data', { id: id })
      .then(res => {
        this.setState({ data: res.data });
      })
      .catch(error => {
        console.log(error);
      });
  }

  componentDidMount() {
    this.loadData(1);
  }

  render() {
    return (
      <View>
        <Text>{this.state.data?.title}</Text>
      </View>
    );
  }
}

export default OldScreen;
```

### Стало (NewScreen.tsx):
```typescript
import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { RootStackParamList } from '../../types/navigation';

type NewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewScreen'>;

interface NewScreenProps {
  navigation: NewScreenNavigationProp;
}

interface NewScreenState {
  data: any | null;
}

class NewScreen extends Component<NewScreenProps, NewScreenState> {
  constructor(props: NewScreenProps) {
    super(props);
    this.state = {
      data: null,
    };
  }

  loadData = async (id: number): Promise<void> => {
    try {
      const res = await api.post('/get-data', { id });
      this.setState({ data: res.data });
    } catch (error) {
      console.log(error);
    }
  }

  async componentDidMount() {
    await this.loadData(1);
  }

  render() {
    return (
      <View>
        <Text>{this.state.data?.title}</Text>
      </View>
    );
  }
}

export default NewScreen;
```

## Быстрые замены (Find & Replace)

1. `import Api from "./utils/Api"` → `import api from '../../services/api'`
2. `Api.post` → `api.post`
3. `Api.get` → `api.get`
4. `require('../images/` → `require('../../../assets/images/`
5. ` == ` → ` === `
6. ` != ` → ` !== `
7. `React.Component` → `Component<Props, State>`
8. `.then(res => {` → `try { const res = await`
9. `.catch(error => {` → `} catch (error) {`

## Проверка перед коммитом

- [ ] Все импорты обновлены
- [ ] Добавлены типы для props и state
- [ ] Все `==` заменены на `===`
- [ ] Все `.then()` заменены на `async/await`
- [ ] Пути к изображениям исправлены
- [ ] Файл переименован в `.tsx`
- [ ] Нет ошибок TypeScript
- [ ] Экран добавлен в навигацию
