// Shared test helpers: render a page inside React Query + a memory router +
// the toast host, and read where the page navigated to.
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen} from '@testing-library/react';
import type {UserEvent} from '@testing-library/user-event';
import type {ReactElement} from 'react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {ToastHost} from '@/components/ui/Toast';
import i18n from '@/lib/i18n';

export const t = i18n.t.bind(i18n);

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {queries: {retry: false, gcTime: Infinity}, mutations: {retry: false}},
  });

// Rendered for any route other than the page under test: shows where we are.
export function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location" data-state={JSON.stringify(location.state ?? null)}>
      {location.pathname}
    </output>
  );
}

interface RenderOptions {
  // URL of the page
  route?: string;
  // query string of the page, e.g. '?q=lat'
  search?: string;
  // route pattern, e.g. '/assistant/trips/:idTrip' (default: route)
  path?: string;
  // router state (location.state)
  state?: unknown;
  // earlier history entries, for navigate(-1)
  history?: string[];
  client?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {route = '/', search, path, state, history = [], client = createTestQueryClient()}: RenderOptions = {},
) {
  const entries = [...history, {pathname: route, search, state}];
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path={path ?? route} element={ui} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
        <ToastHost />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return {...result, client};
}

// Path / state the page navigated to (rendered by LocationProbe)
export const currentPath = async () => (await screen.findByTestId('location')).textContent;
export const currentState = async () =>
  JSON.parse((await screen.findByTestId('location')).dataset.state ?? 'null');

// Errors shaped like the ones axios rejects with
export const httpError = (status: number, data: Record<string, unknown> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: {status, data},
  });

export const networkError = () =>
  Object.assign(new Error('Network Error'), {isAxiosError: true});

// a promise that never settles: keeps a query / mutation pending
export const pending = <T,>() => new Promise<T>(() => undefined);

// Chooses an option of the app's own dropdown (AdminSelect): opens it from its button, then clicks the
// option with this value (what a <select> test did with selectOptions).
export const pickOption = async (user: UserEvent, trigger: HTMLElement, value: string) => {
  await user.click(trigger);
  const list = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
  const option = list?.querySelector<HTMLElement>(`button[data-value="${value}"]`);
  if (!option) {
    throw new Error(`No option "${value}" in the dropdown`);
  }
  await user.click(option);
};
