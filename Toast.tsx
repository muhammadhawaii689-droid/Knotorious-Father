import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let bg = 'bg-[#0d1527]/95 border-sky-500/30';
            let icon = <Info className="h-5 w-5 text-sky-400" />;
            if (toast.type === 'success') {
              bg = 'bg-[#0d1b24]/95 border-emerald-500/30';
              icon = <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
            } else if (toast.type === 'error') {
              bg = 'bg-[#1b0d14]/95 border-rose-500/30';
              icon = <AlertTriangle className="h-5 w-5 text-rose-400" />;
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${bg} backdrop-blur-md shadow-lg shadow-black/40`}
              >
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 text-sm text-[#c0d8f0] font-medium leading-relaxed">
                  {toast.message}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 text-[#4a6a8a] hover:text-[#c0d8f0] transition-colors p-0.5 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
