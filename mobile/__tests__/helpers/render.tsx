import React from 'react';
import {Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AuthContext, AuthContextValue} from '../../src/store/session';

// Renders inside act(), so effects have run when it returns.
export const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

export const queryClient = () =>
  new QueryClient({
    defaultOptions: {queries: {retry: false, gcTime: Infinity}},
  });

export const makeAuth = (
  over: Partial<AuthContextValue> = {},
): AuthContextValue => ({
  user: {username: 'luan', fullname: 'Luan', email: 'luan@example.com'},
  signIn: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  ...over,
});

// With React Query and the signed-in user, like inside the app.
export const renderApp = (
  element: React.ReactElement,
  {auth = makeAuth(), client = queryClient()} = {},
) =>
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>{element}</AuthContext.Provider>
    </QueryClientProvider>,
  );

// Lets promises (mocked API calls, React Query) settle.
export const flush = async (times = 5) => {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
};

const textOf = (n: renderer.ReactTestInstance) =>
  [n.props.children].flat(Infinity).join('');

// All the text of a tree, flattened.
export const allText = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(textOf).join('|');

export const press = (node: renderer.ReactTestInstance, ...args: unknown[]) =>
  act(() => {
    node.props.onPress(...args);
  });

// Presses the closest pressable around the Text whose content is `text`.
export const pressText = (
  tree: renderer.ReactTestRenderer,
  text: string,
  which: 'first' | 'last' = 'first',
) => {
  const found = tree.root.findAllByType(Text).filter(n => textOf(n) === text);
  const t = which === 'first' ? found[0] : found[found.length - 1];
  if (!t) {
    throw new Error(`no text "${text}"`);
  }
  let n: renderer.ReactTestInstance | null = t;
  while (n && !n.props.onPress) {
    n = n.parent;
  }
  if (!n) {
    throw new Error(`"${text}" is not pressable`);
  }
  return press(n);
};

export {act, renderer};
