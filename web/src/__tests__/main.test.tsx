// src/main.tsx mounts the app into #root.
import {screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@/app/App', () => ({default: () => <p>the app</p>}));

describe('main', () => {
  it('renders the app into #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('@/main');

    expect(await screen.findByText('the app')).toBeInTheDocument();
    expect(document.getElementById('root')).toContainElement(screen.getByText('the app'));
  });
});
