import {useEffect} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Navigation from './navigation/Navigation';
import {ToastHost} from './components/Toast';
import {saveUserLocation} from './Helper/location';

const queryClient = new QueryClient();

export default function App() {
  // Mobile asked for location permission on start and stored the user's
  // county as 'userLocation'. The browser asks for permission on this call.
  // (Push notifications via FCM are mobile-only and are not used on the web.)
  useEffect(() => {
    saveUserLocation().catch(err =>
      console.warn('Không lấy được vị trí người dùng:', err),
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <ToastHost />
    </QueryClientProvider>
  );
}
