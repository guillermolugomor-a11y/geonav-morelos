import React from 'react';

interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8 md:p-12',
};

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  className = '',
  padding = 'md',
  shadow = true,
}) => {
  return (
    <div
      className={[
        'bg-surface-container-lowest rounded-3xl',
        shadow ? 'civic-shadow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <div className="px-6 pt-6 pb-4 border-b border-on-surface-variant/5">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="px-6 pb-6 pt-4 border-t border-on-surface-variant/5">
          {footer}
        </div>
      )}
    </div>
  );
};

interface CardSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <div className={['space-y-3', className].join(' ')}>
      {title && (
        <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
