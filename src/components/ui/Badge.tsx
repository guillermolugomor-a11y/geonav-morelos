import React from 'react';

type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'programada';
type BadgeVariant = TaskStatus | 'info' | 'warning' | 'success' | 'error' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  en_progreso: 'bg-blue-50 text-blue-700 border-blue-200',
  completada: 'bg-green-50 text-green-700 border-green-200',
  programada: 'bg-purple-50 text-purple-700 border-purple-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-surface-container-low text-on-surface-variant border-outline-variant/30',
};

const dotColors: Record<BadgeVariant, string> = {
  pendiente: 'bg-amber-500',
  en_progreso: 'bg-blue-500',
  completada: 'bg-green-500',
  programada: 'bg-purple-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  neutral: 'bg-on-surface-variant/40',
};

const statusLabels: Partial<Record<TaskStatus, string>> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  programada: 'Programada',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className={['w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus; className?: string }> = ({
  status,
  className,
}) => (
  <Badge variant={status} dot className={className}>
    {statusLabels[status] ?? status}
  </Badge>
);
