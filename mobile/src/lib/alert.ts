// Imperative API of the <Alert /> component (mounted once in App): call it from anywhere.
export type AlertType = 'success' | 'error' | 'info' | 'confirm';

export interface AlertOptions {
  type: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  // confirm dialogs: a red "danger" confirm button (delete...)
  destructive?: boolean;
  onConfirm?: () => void;
}

type Listener = (options: AlertOptions) => void;
let listener: Listener | null = null;

export const subscribeAlert = (next: Listener) => {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
};

const show = (options: AlertOptions) => listener?.(options);

export const alert = {
  success: (title: string, message?: string) => show({type: 'success', title, message}),
  error: (title: string, message?: string) => show({type: 'error', title, message}),
  info: (title: string, message?: string) => show({type: 'info', title, message}),
  confirm: (options: Omit<AlertOptions, 'type'>) => show({...options, type: 'confirm'}),
};
