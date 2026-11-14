import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {clearSession} from '@/features/auth/store/session';
import {resetChatCache} from '@/features/assistant/store/chatCache';

// Signs out: drops the session, the open chat and every cached query, then
// goes back to the landing page. Used by the profile page and the admin panel.
export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return () => {
    clearSession();
    resetChatCache();
    queryClient.clear();
    navigate(routes.LandingPage, {replace: true});
  };
};
