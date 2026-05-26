import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUiStore, Toast } from '../../store/ui.store';

const typeStyles: Record<Toast['type'], string> = {
  info: 'bg-zinc-800 border-white/10 text-white',
  success: 'bg-green-900/80 border-green-500/30 text-green-100',
  error: 'bg-red-900/80 border-red-500/30 text-red-100',
  warning: 'bg-amber-900/80 border-amber-500/30 text-amber-100',
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useUiStore(s => s.removeToast);

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm',
        'animate-in slide-in-from-bottom-2 fade-in duration-200',
        typeStyles[toast.type],
      ].join(' ')}
      style={{ animation: 'toastIn 200ms cubic-bezier(0.4,0,0.2,1)' }}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useUiStore(s => s.toasts);

  return ReactDOM.createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>,
    document.body
  );
};
