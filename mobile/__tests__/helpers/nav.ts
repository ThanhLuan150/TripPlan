import {useEffect} from 'react';

// One shared fake of the navigation object and the route, reset by resetNav().
export const nav = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
};
export const route: {params: Record<string, unknown>; name: string} = {
  params: {},
  name: 'Test',
};

export const resetNav = (params: Record<string, unknown> = {}) => {
  Object.values(nav).forEach(fn => fn.mockReset());
  route.params = params;
};

// What jest.mock('@react-navigation/native') returns.
export const navModule = {
  useNavigation: () => nav,
  useRoute: () => route,
  // runs on mount, like the real hook does on focus
  useFocusEffect: (cb: () => void | (() => void)) => {
    useEffect(cb, [cb]);
  },
  useIsFocused: () => true,
  NavigationContainer: ({children}: {children: unknown}) => children,
};
