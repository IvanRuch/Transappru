import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationData {
  title: string;
  body: string;
}

interface NotificationContextType {
  showNotification: (title: string, body: string) => void;
  notification: NotificationData | null;
  visible: boolean;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [visible, setVisible] = useState(false);

  const showNotification = (title: string, body: string) => {
    setNotification({ title, body });
    setVisible(true);
  };

  const hideNotification = () => {
    setVisible(false);
    setTimeout(() => {
      setNotification(null);
    }, 300);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        notification,
        visible,
        hideNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
