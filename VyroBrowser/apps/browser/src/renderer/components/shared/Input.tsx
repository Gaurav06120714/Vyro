import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-white/60 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div
          className={[
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'bg-white/6 border transition-colors duration-150',
            error ? 'border-red-500/60' : 'border-white/10 focus-within:border-vyro-500/60',
          ].join(' ')}
        >
          {prefix && <span className="text-white/40 shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={[
              'flex-1 bg-transparent text-sm text-white placeholder:text-white/30',
              'focus:outline-none min-w-0',
              className,
            ].join(' ')}
            {...props}
          />
          {suffix && <span className="text-white/40 shrink-0">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
