import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import Alert from './src/components/Alert';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {setOnUnauthorized} from './src/lib/apiClient';
import {
  AuthContext,
  AuthContextValue,
  SessionUser,
  clearSession,
  loadSession,
  saveSession,
} from './src/store/session';
import {Loading} from './src/components';
import RootNavigator from './src/navigation/RootNavigator';
import './src/i18n';
import {loadLanguage} from './src/i18n';

const queryClient = new QueryClient({defaultOptions: {queries: {retry: 1}}});

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLanguage();
    loadSession().then(s => {
      setUser(s?.data ?? null);
      setReady(true);
    });
    setOnUnauthorized(() => {
      queryClient.clear();
      setUser(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: async s => {
        await saveSession(s);
        setUser(s.data);
      },
      signOut: async () => {
        await clearSession();
        queryClient.clear();
        setUser(null);
      },
    }),
    [user],
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={value}>
          {ready ? (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            <Loading />
          )}
        </AuthContext.Provider>
      <Alert />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
