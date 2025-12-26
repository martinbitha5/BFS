/**
 * Système de Notifications Global
 * Fournit un context pour afficher des notifications toast dans toute l'application
 */

import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
  clearAll: () => void;
  // Raccourcis
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    bg: 'bg-green-900/90 border-green-500/50',
    icon: 'text-green-400',
    title: 'text-green-100',
    message: 'text-green-200/80',
  },
  error: {
    bg: 'bg-red-900/90 border-red-500/50',
    icon: 'text-red-400',
    title: 'text-red-100',
    message: 'text-red-200/80',
  },
  warning: {
    bg: 'bg-yellow-900/90 border-yellow-500/50',
    icon: 'text-yellow-400',
    title: 'text-yellow-100',
    message: 'text-yellow-200/80',
  },
  info: {
    bg: 'bg-blue-900/90 border-blue-500/50',
    icon: 'text-blue-400',
    title: 'text-blue-100',
    message: 'text-blue-200/80',
  },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }
  }, [hideNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Raccourcis
  const success = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const error = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message, duration: 8000 });
  }, [showNotification]);

  const warning = useCallback((title: string, message?: string) => {
    showNotification({ type: 'warning', title, message });
  }, [showNotification]);

  const info = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        hideNotification,
        clearAll,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      
      {/* Container des notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {notifications.map((notification, index) => {
          const Icon = ICONS[notification.type];
          const styles = STYLES[notification.type];

          return (
            <div
              key={notification.id}
              className={`
                ${styles.bg}
                backdrop-blur-md border rounded-lg shadow-xl p-4
                pointer-events-auto
                animate-slide-in-right
                transform transition-all duration-300
              `}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm ${styles.title}`}>
                    {notification.title}
                  </h4>
                  {notification.message && (
                    <p className={`text-sm mt-1 ${styles.message}`}>
                      {notification.message}
                    </p>
                  )}
                  {notification.action && (
                    <button
                      onClick={notification.action.onClick}
                      className={`mt-2 text-sm font-medium underline ${styles.title} hover:opacity-80`}
                    >
                      {notification.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => hideNotification(notification.id)}
                  className={`flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors ${styles.icon}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Ajouter l'animation CSS au fichier index.css ou dans un style tag
export const notificationStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out forwards;
}
`;

