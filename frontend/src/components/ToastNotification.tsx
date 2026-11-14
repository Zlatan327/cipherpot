import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X, ExternalLink } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <div className="toast-icon">
              {isSuccess && <CheckCircle2 size={18} className="text-success" />}
              {isError && <AlertTriangle size={18} className="text-danger" />}
              {!isSuccess && !isError && <Info size={18} className="text-accent" />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
              {toast.txHash && (
                <a
                  href={`https://testnet.nearblocks.io/txns/${toast.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="toast-tx-link"
                >
                  View on Nearblocks Explorer <ExternalLink size={12} />
                </a>
              )}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
