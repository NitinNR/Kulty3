import { createContext } from 'react';
import { Toaster, toast } from 'react-hot-toast';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showLoading = (message) => toast.loading(message);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showLoading }}>
      <Toaster position="top-right" />
      {children}
    </ToastContext.Provider>
  );
};
