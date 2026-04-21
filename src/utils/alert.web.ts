/**
 * Web version of showAlert.
 * Uses native window.alert. Title prepended when both title and message are provided,
 * so users see context (matches mobile Alert.alert where title is shown separately).
 */
export const showAlert = (title: string, message?: string): void => {
  if (typeof window === 'undefined') return;
  window.alert(message ? `${title}\n\n${message}` : title);
};
