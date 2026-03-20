import { supabase } from '../lib/supabaseClient';

export interface AppNotification {
    id: string;
    user_id: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    tipo: 'task_assigned' | 'status_changed' | 'new_comment';
    metadata: any;
    created_at: string;
}

export const notificationService = {
    /**
     * Marca todas las notificaciones de una tarea específica como leídas
     */
    async markTaskNotificationsAsRead(userId: string, tareaId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('user_id', userId)
            .eq('leida', false)
            .filter('metadata->>tarea_id', 'eq', tareaId);

        if (error) {
            console.error('Error marking task notifications as read:', error);
            return false;
        }
        return true;
    },

    /**
     * Obtiene las notificaciones no leídas para el usuario actual
     */
    async getUnreadNotifications(userId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('user_id', userId)
            .eq('leida', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching unread notifications:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Marca una notificación como leída
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
        return true;
    },

    /**
     * Marca todas las notificaciones del usuario como leídas
     */
    async markAllAsRead(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('user_id', userId)
            .eq('leida', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            return false;
        }
        return true;
    },

    /**
     * Se suscribe a nuevas notificaciones en tiempo real
     */
    subscribeToNotifications(userId: string, onNewNotification: (notification: AppNotification) => void) {
        console.log(`%c🔔 notificationService: Intentando suscripción para usuario: ${userId}`, 'color: #8C3154; font-weight: bold');
        
        const channel = supabase.channel(`notifications-${userId}`);
        
        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('%c🔔 notificationService: ¡NUEVA FILA DETECTADA!', 'color: #ffffff; background: #22c55e; padding: 2px 5px; border-radius: 3px', payload);
                    onNewNotification(payload.new as AppNotification);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('%c🔔 notificationService: ✅ CONECTADO EXITOSAMENTE A REALTIME', 'color: #22c55e; font-weight: bold');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('%c🔔 notificationService: ❌ ERROR DE CANAL:', 'color: #ef4444; font-weight: bold', err);
                }
            });

        return channel;
    }
};
