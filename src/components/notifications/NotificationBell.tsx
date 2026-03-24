import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, Clipboard, Activity, CheckCircle } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationBell: React.FC = React.memo(() => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all relative ${isOpen ? 'bg-[#8C3154]/10 text-[#8C3154]' : 'text-stone-500 hover:bg-stone-100'
                    }`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white transform translate-x-1 -translate-y-1">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="fixed inset-x-4 top-20 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-3 w-auto md:w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-[1001]"
                    >
                        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                            <h3 className="font-bold text-stone-900 flex items-center gap-2">
                                Notificaciones
                                <span className="bg-[#8C3154]/10 text-[#8C3154] text-xs px-2 py-0.5 rounded-full">
                                    {unreadCount} nuevas
                                </span>
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-[#8C3154] hover:text-[#7a2a49] font-bold flex items-center gap-1"
                                >
                                    <Check size={12} />
                                    Leer todo
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="bg-stone-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell size={24} className="text-stone-300" />
                                    </div>
                                    <p className="text-sm text-stone-500">No hay notificaciones nuevas</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-100">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className="p-4 hover:bg-stone-50 transition-colors group relative"
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${n.tipo === 'task_assigned' ? 'bg-[#8C3154]/10 text-[#8C3154]' : 'bg-[#BC9B73]/10 text-[#BC9B73]'
                                                    }`}>
                                                    {n.tipo === 'task_assigned' ? <Clipboard size={14} /> : <Activity size={14} />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-stone-900 leading-tight">
                                                        {n.titulo}
                                                    </p>
                                                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                                                        {n.mensaje}
                                                    </p>
                                                    <p className="text-[10px] text-stone-400 mt-2 font-medium">
                                                        Hace un momento
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => markAsRead(n.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded text-stone-400 transition-all absolute top-2 right-2"
                                                    title="Marcar como leída"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 bg-stone-50 border-t border-stone-200 text-center">
                                <button className="text-xs text-stone-500 font-bold hover:text-stone-700">
                                    Ver todas las notificaciones
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
