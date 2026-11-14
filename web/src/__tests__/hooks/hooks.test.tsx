import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, renderHook, screen, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {useClickOutside} from '@/hooks/useClickOutside';
import {useProfile} from '@/hooks/useProfile';

describe('useClickOutside', () => {
  function Menu({onOutside}: {onOutside: () => void}) {
    const ref = useClickOutside(onOutside);
    return (
      <div>
        <div ref={ref}>
          <button>inside</button>
        </div>
        <button>outside</button>
      </div>
    );
  }

  it('calls back for clicks outside the element only', () => {
    const onOutside = vi.fn();
    render(<Menu onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByText('inside'));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByText('outside'));
    expect(onOutside).toHaveBeenCalledOnce();
  });

  it('stops listening after unmount', () => {
    const onOutside = vi.fn();
    const {unmount} = render(<Menu onOutside={onOutside} />);

    unmount();
    fireEvent.mouseDown(document.body);

    expect(onOutside).not.toHaveBeenCalled();
  });
});

describe('useProfile', () => {
  const wrapper = ({children}: {children: ReactNode}) => (
    <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
      {children}
    </QueryClientProvider>
  );

  it('returns no user when signed out', async () => {
    const {result} = renderHook(() => useProfile(), {wrapper});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.user).toBeNull();
    expect(result.current.name).toBe('');
  });

  it('returns the stored user, named by full name then username', async () => {
    saveSession({accessToken: 't', data: {username: 'lan', fullname: 'Lan Nguyễn'}});
    const {result} = renderHook(() => useProfile(), {wrapper});

    await waitFor(() => expect(result.current.user?.username).toBe('lan'));
    expect(result.current.name).toBe('Lan Nguyễn');
  });

  it('falls back to the username', async () => {
    saveSession({accessToken: 't', data: {username: 'lan'}});
    const {result} = renderHook(() => useProfile(), {wrapper});

    await waitFor(() => expect(result.current.name).toBe('lan'));
  });
});
