import { getApps } from '@react-native-firebase/app';

export class FirebaseService {
  /**
   * Базовая инициализация Firebase.
   * В большинстве случаев в Expo с использованием @react-native-firebase/app 
   * она происходит автоматически через нативные конфиги.
   */
  static initialize() {
    try {
      const apps = getApps();
      if (apps.length === 0) {
        console.log('🔥 [Firebase] App initialization check...');
      } else {
        console.log('🔥 [Firebase] Already active:', apps.length, 'app(s)');
      }
    } catch (error) {
      console.error('🔥 [Firebase] Initialization error:', error);
    }
  }
}