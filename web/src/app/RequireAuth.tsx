import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {getUser} from '@/features/auth/store/session';
import type {Role} from '@/features/auth/types';
import {routes} from './routes';

// Route guard (RequireRole): signed in, and, when `roles` is given, one of
// those roles. Example: <Route element={<RequireAuth roles={['admin']} />}>
export default function RequireAuth({roles}: {roles?: Role[]}) {
  const location = useLocation();
  const user = getUser();
  if (!user) {
    return <Navigate to={routes.LandingPage} replace state={{from: location}} />;
  }
  if (roles && !roles.includes(user.role ?? 'user')) {
    return <Navigate to={routes.Home} replace />;
  }
  return <Outlet />;
}
