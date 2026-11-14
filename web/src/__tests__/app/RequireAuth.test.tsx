import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {describe, expect, it} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import type {Role} from '@/features/auth/types';
import RequireAuth from '@/app/RequireAuth';
import {routerFuture, routes} from '@/app/routes';

function Landing() {
  const location = useLocation();
  const from = (location.state as {from?: {pathname: string}} | null)?.from?.pathname;
  return <p>landing{from ? ` from ${from}` : ''}</p>;
}

const renderAt = (path: string, roles?: Role[]) =>
  render(
    <MemoryRouter initialEntries={[path]} future={routerFuture}>
      <Routes>
        <Route path={routes.LandingPage} element={<Landing />} />
        <Route path={routes.Home} element={<p>home</p>} />
        <Route element={<RequireAuth roles={roles} />}>
          <Route path={routes.Profile} element={<p>profile</p>} />
          <Route path="/admin" element={<p>admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const signIn = (role?: Role) => saveSession({accessToken: 't', data: {username: 'lan', role}});

describe('RequireAuth', () => {
  it('sends visitors to the landing page, remembering where they wanted to go', () => {
    renderAt(routes.Profile);

    expect(screen.getByText('landing from /profile')).toBeInTheDocument();
  });

  it('shows the page to a signed-in user', () => {
    signIn();
    renderAt(routes.Profile);

    expect(screen.getByText('profile')).toBeInTheDocument();
  });

  it('sends a user without the required role home', () => {
    signIn('user');
    renderAt('/admin', ['admin']);

    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('treats a user without role as "user"', () => {
    signIn(undefined);
    renderAt('/admin', ['user', 'admin']);

    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('lets an admin in', () => {
    signIn('admin');
    renderAt('/admin', ['admin']);

    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
