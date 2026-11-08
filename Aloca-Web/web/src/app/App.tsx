import {useEffect} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AppRouter from './router';
import {ToastHost} from '@/components/ui/Toast';
import {saveUserLocation} from '@/lib/location';

const queryClient = new QueryClient();

export default function App() {
  // Refresh the user's county ('userLocation', used when generating trips) if
  // location is already allowed. We do not prompt on page load: the browser
  // asks when a feature needs it (challenge photo, "my location" on the map),
  // with an explanation first. (FCM push notifications are mobile-only.)
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
