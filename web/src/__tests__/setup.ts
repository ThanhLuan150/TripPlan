// Runs before every test file (vitest.config.ts > setupFiles).
import '@testing-library/jest-dom/vitest';
import {act, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, vi} from 'vitest';
import '@/lib/i18n';
import Toast from '@/components/ui/Toast';
import {mockAdminApi} from './fixtures/admin/mockAdminApi';

// The admin API is never called for real: every test starts with the fixtures
// answering (a test overrides what it needs).
vi.mock('@/features/admin/api');
vi.mock('@/features/admin/users/api');

beforeEach(() => {
  mockAdminApi();
});

// jsdom has no layout: scrolling an element is a no-op
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => undefined;
}

afterEach(() => {
  cleanup();
  // toasts are module state shared by the tests of a file
  act(() => Toast.hide());
  window.localStorage.clear();
});
