import React from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationIndicatorProps {
  hasUnread: boolean;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
  showText?: boolean;
}

export const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({
  hasUnread,
  size = 'md',
  pulse = true,
  className = '',
  showText = false
}) => {
  if (!hasUnread) return null;

  const iconSize = size === 'sm' ? 'w-2 h-2' : 'w-3.5 h-3.5';
  const containerPadding = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {pulse && (
          <div className="absolute inset-0 animate-ping bg-[#8C3154] rounded-full opacity-30"></div>
        )}
        <div className={`bg-[#8C3154] ${containerPadding} rounded-full relative shadow-sm border border-white/20`}>
          <Bell className={`${iconSize} text-white fill-current`} />
        </div>
        {!pulse && (
           <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full border border-stone-100" />
        )}
      </div>
      {showText && (
        <span className="text-[10px] font-bold text-[#8C3154] uppercase tracking-tighter animate-pulse">
          Nuevo
        </span>
      )}
    </motion.div>
  );
};
