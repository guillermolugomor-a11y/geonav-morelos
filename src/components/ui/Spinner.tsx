import React from 'react';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'white' | 'current';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

const colorClasses: Record<SpinnerColor, string> = {
  primary: 'border-primary/20 border-t-primary',
  white: 'border-white/30 border-t-white',
  current: 'border-current/20 border-t-current',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  label,
}) => {
  return (
    <span
      role="status"
      aria-label={label ?? 'Cargando'}
      className={['inline-flex flex-col items-center gap-2', className].join(' ')}
    >
      <span
        className={[
          'rounded-full animate-spin flex-shrink-0',
          sizeClasses[size],
          colorClasses[color],
        ].join(' ')}
      />
      {label && (
        <span className="text-xs text-on-surface-variant/60 font-medium">{label}</span>
      )}
    </span>
  );
};

export const FullPageSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex-1 flex items-center justify-center min-h-[200px]">
    <Spinner size="lg" label={label} />
  </div>
);
