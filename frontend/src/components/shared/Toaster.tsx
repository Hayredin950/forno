import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext).showToast;
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-3 max-w-sm">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`glass-card-elevated p-4 flex items-start gap-3 min-w-[300px] border-l-[3px] ${
                t.type === 'success' ? 'border-l-[#7CB342]' : t.type === 'warning' ? 'border-l-[#F9A825]' : 'border-l-[#E53935]'
              }`}
            >
              {t.type === 'success' ? <CheckCircle size={18} className="text-[#7CB342] mt-0.5 shrink-0" /> :
               t.type === 'warning' ? <AlertTriangle size={18} className="text-[#F9A825] mt-0.5 shrink-0" /> :
               <XCircle size={18} className="text-[#E53935] mt-0.5 shrink-0" />}
              <p className="text-sm text-forno-text-primary flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="text-forno-text-muted hover:text-forno-text-primary">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function Toaster() {
  return null;
}
