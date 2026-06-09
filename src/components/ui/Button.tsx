import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'premium-gradient text-white hover:opacity-90 civic-shadow disabled:opacity-50',
  secondary:
    'bg-surface-container-low text-on-surface hover:bg-outline-variant/20 border border-outline-variant/30',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container-low',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs rounded-xl gap-1.5',
  md: 'px-5 py-3 text-sm rounded-2xl gap-2',
  lg: 'px-6 py-4 text-sm rounded-2xl gap-3',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children && <span className="tracking-wide">{children}</span>}
    </button>
  );
};
