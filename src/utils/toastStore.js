// Site-wide toast queue — one store, subscribed to by the single <ToastHost />
// mounted in App.jsx, so any module can raise a toast without mounting its
// own host or passing one down through props.
const listeners = new Set();
let toasts = [];

const notify = () => {
  listeners.forEach((listener) => listener(toasts));
};

const getToastsSnapshot = () => toasts;

const subscribeToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const addToast = (toast) => {
  toasts = [...toasts, toast];
  notify();
};

const removeToast = (id) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
};

export {
  addToast,
  removeToast,
  subscribeToasts,
  getToastsSnapshot,
};
