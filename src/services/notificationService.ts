import { supabase } from '../lib/supabaseClient';

export interface AppNotification {
    id: string;
    user_id: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    tipo: 'task_assigned' | 'status_changed';
    metadata: any;
    created_at: string;
}

export const notificationService = {
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
        return supabase
            .channel(`public:notificaciones:user_id=eq.${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onNewNotification(payload.new as AppNotification);
                }
            )
            .subscribe();
    }
};
