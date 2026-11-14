import {useEffect} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AppRouter from './router';
import {ToastHost} from '@/components/ui/Toast';
import {saveUserLocation} from '@/lib/location';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    saveUserLocation().catch(err =>
      console.warn('Không lấy được vị trí người dùng:', err),
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <ToastHost />
    </QueryClientProvider>
  );
}
