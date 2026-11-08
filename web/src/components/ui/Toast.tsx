import {useEffect, useState} from 'react';
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoInformationCircle,
} from 'react-icons/io5';

// Web replacement for react-native-toast-message, same call shape:
// Toast.show({type: 'success' | 'error', text1, text2})

type ToastType = 'success' | 'error' | 'info';
interface ToastOptions {
  type?: ToastType;
  text1?: string;
  text2?: string;
  visibilityTime?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
}

type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l(items));

const hide = (id?: number) => {
  items = id === undefined ? [] : items.filter(t => t.id !== id);
  emit();
};

const show = (options: ToastOptions) => {
  const item: ToastItem = {type: 'success', ...options, id: nextId++};
  // Like the mobile lib, a new toast replaces the visible one.
  items = [item];
  emit();
  window.setTimeout(() => hide(item.id), options.visibilityTime ?? 4000);
};

const Toast = {show, hide};
export default Toast;

const styles: Record<ToastType, {icon: typeof IoCheckmarkCircle; tone: string}> =
  {
    success: {icon: IoCheckmarkCircle, tone: 'text-brand-500'},
    error: {icon: IoCloseCircle, tone: 'text-rose-500'},
    info: {icon: IoInformationCircle, tone: 'text-sky-500'},
  };

export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex flex-col items-center gap-2 px-4"
      aria-live="polite">
      {list.map(t => {
        const {icon: Icon, tone} = styles[t.type ?? 'success'];
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => hide(t.id)}
            className="pointer-events-auto flex w-full max-w-sm cursor-pointer animate-slide-down items-start gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100">
            <Icon size={24} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />
            <div className="min-w-0">
              {t.text1 && (
                <p className="font-semibold text-slate-900">{t.text1}</p>
              )}
              {t.text2 && (
                <p className="mt-0.5 text-sm text-slate-500">{t.text2}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
