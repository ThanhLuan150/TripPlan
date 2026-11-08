import {useQuery} from '@tanstack/react-query';
import {getUser} from '@/features/auth/store/session';

// The signed-in user (from storage). Invalidate ['profile'] after changing it.
export const useProfile = () => {
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: async () => getUser(),
  });
  const user = query.data ?? null;
  const name = user?.fullname || user?.username || '';
  return {...query, user, name};
};
