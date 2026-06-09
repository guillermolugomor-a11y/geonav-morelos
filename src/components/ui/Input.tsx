import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  icon,
  id,
  className = '',
  ...props
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none transition-all',
            'placeholder:text-on-surface-variant/30 text-on-surface',
            error
              ? 'ring-2 ring-red-400/50'
              : 'focus:ring-2 focus:ring-primary/20',
            icon ? 'pl-11' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[11px] text-red-600 font-semibold ml-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-[11px] text-on-surface-variant/50 ml-1">{helper}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helper,
  id,
  className = '',
  ...props
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={[
          'w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none transition-all resize-none',
          'placeholder:text-on-surface-variant/30 text-on-surface',
          error
            ? 'ring-2 ring-red-400/50'
            : 'focus:ring-2 focus:ring-primary/20',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && (
        <p className="text-[11px] text-red-600 font-semibold ml-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-[11px] text-on-surface-variant/50 ml-1">{helper}</p>
      )}
    </div>
  );
};
