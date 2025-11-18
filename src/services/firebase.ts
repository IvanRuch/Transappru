import { Platform } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import { 
  requestUserPermission, 
  requestAndroidPermission,
  getFCMToken,
  NotificationListener
} from '../utils/PushNotificationHelper';

export class FirebaseService {
  // Инициализация Firebase (вызывается один раз при старте)
  static initialize() {
    try {
      // Проверяем, не инициализирован ли уже Firebase (новая модульная API)
      const apps = getApps();
      if (apps.length === 0) {
        // Firebase инициализируется автоматически из google-services.json (Android)
        // и GoogleService-Info.plist (iOS)
        console.log('Firebase initializing...');
        // Инициализация происходит автоматически при первом импорте
        console.log('Firebase initialized');
      } else {
        console.log('Firebase already initialized:', apps.length, 'app(s)');
      }
    } catch (error) {
      console.log('Error initializing Firebase:', error);
    }
  }

  // Запрос разрешений - аналогично старому проекту
  static requestPermission() {
    if (Platform.OS === 'android') {
      console.log('Platform.OS is android');
      requestAndroidPermission();
    } else {
      console.log('Platform.OS is ' + Platform.OS);
      requestUserPermission();
    }
  }

  // Получение FCM токена - используется в AuthScreen
  static async getToken() {
    await getFCMToken();
  }

  // Настройка слушателей - аналогично старому проекту
  static setupNotificationListeners() {
    try {
      // Настраиваем foreground слушатели
      // Background handler временно отключен из-за проблем с инициализацией в Expo
      NotificationListener();
    } catch (error) {
      console.log('Error setting up notification listeners:', error);
    }
  }
}
