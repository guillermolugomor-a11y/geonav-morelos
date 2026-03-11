import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppNotification, notificationService } from '../../services/notificationService';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode; userId: string | undefined }> = ({ children, userId }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        // Carga inicial
        const loadNotifications = async () => {
            const data = await notificationService.getUnreadNotifications(userId);
            setNotifications(data);
        };

        loadNotifications();

        // Suscripción en tiempo real
        const channel = notificationService.subscribeToNotifications(userId, (newNotification) => {
            setNotifications((prev) => [newNotification, ...prev]);

            if (window.Notification && window.Notification.permission === 'granted') {
                new window.Notification(newNotification.titulo, { body: newNotification.mensaje });
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [userId]);

    const markAsRead = async (id: string) => {
        const success = await notificationService.markAsRead(id);
        if (success) {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        const success = await notificationService.markAllAsRead(userId);
        if (success) {
            setNotifications([]);
        }
    };

    const unreadCount = notifications.length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
