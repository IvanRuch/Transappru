import { Alert } from 'react-native';

/**
 * Cross-platform alert helper.
 * Mobile: native Alert.alert dialog.
 * Web (see alert.web.ts): window.alert with title+message concatenation.
 */
export const showAlert = (title: string, message?: string): void => {
  Alert.alert(title, message);
};
