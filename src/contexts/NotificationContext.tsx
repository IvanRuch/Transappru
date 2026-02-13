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
  viewedCount: number;
  addViewedCount: (count: number) => void;
  resetViewedCount: () => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [visible, setVisible] = useState(false);
  const viewedCountRef = React.useRef(0);
  const [viewedCount, setViewedCount] = useState(0);

  const addViewedCount = (count: number) => {
    viewedCountRef.current += count;
    setViewedCount(viewedCountRef.current);
  };

  const resetViewedCount = (): number => {
    const count = viewedCountRef.current;
    viewedCountRef.current = 0;
    setViewedCount(0);
    return count;
  };

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
        viewedCount,
        addViewedCount,
        resetViewedCount,
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
