import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppNotification, notificationService } from '../../services/notificationService';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    markTaskNotificationsAsRead: (tareaId: string) => Promise<void>;
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
            console.log('%c🔔 NotificationProvider: Cargando para ' + userId, 'color: #8C3154; font-weight: bold');
            const data = await notificationService.getUnreadNotifications(userId);
            console.log('%c🔔 NotificationProvider: Data inicial:', 'color: #8C3154', data);
            setNotifications(data || []);
        };

        loadNotifications();

        // Suscripción en tiempo real
        console.log('%c🔔 NotificationProvider: Suscribiendo a Realtime...', 'color: #8C3154; font-weight: bold');
        const channel = notificationService.subscribeToNotifications(userId, (newNotification) => {
            console.log('%c🔔 NotificationProvider: ¡NOTIFICACIÓN RECIBIDA EN TIEMPO REAL!', 'color: #ffffff; background: #8C3154; padding: 4px; border-radius: 4px', newNotification);
            setNotifications((prev) => [newNotification, ...prev]);

            if (window.Notification && window.Notification.permission === 'granted') {
                new window.Notification(newNotification.titulo, { body: newNotification.mensaje });
            }
        });

        return () => {
            console.log('%c🔔 NotificationProvider: Desuscribiendo', 'color: #8C3154; opacity: 0.5');
            channel.unsubscribe();
        };
    }, [userId]);

    // Usamos un ref para tener acceso a las notificaciones actuales dentro de las funciones asíncronas
    // sin tener que incluirlas en las dependencias de useCallback
    const notificationsRef = React.useRef(notifications);
    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    const markAsRead = useCallback(async (id: string) => {
        const success = await notificationService.markAsRead(id);
        if (success) {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        const success = await notificationService.markAllAsRead(userId);
        if (success) {
            setNotifications([]);
        }
    }, [userId]);

    const markTaskNotificationsAsRead = useCallback(async (tareaId: string) => {
        if (!userId) return;
        
        // Verificamos si realmente hay algo que marcar como leído para esta tarea
        const hasUnread = notificationsRef.current.some(n => n.metadata?.tarea_id === tareaId);
        if (!hasUnread) return;

        const success = await notificationService.markTaskNotificationsAsRead(userId, tareaId);
        if (success) {
            setNotifications((prev) => prev.filter((n) => n.metadata?.tarea_id !== tareaId));
        }
    }, [userId]);

    const unreadCount = notifications.length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, markTaskNotificationsAsRead }}>
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
