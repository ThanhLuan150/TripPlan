import {act} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import i18n, {languages} from '@/lib/i18n';

describe('config (backend URL)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // a fresh copy of the module (the setup file already loaded one through the API client)
  const load = async () => {
    vi.resetModules();
    return (await import('@/lib/config')).API_URL;
  };

  it('uses VITE_API_URL without trailing slashes', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.aloca.vn///');
    expect(await load()).toBe('https://api.aloca.vn');
  });

  it("falls back to the mobile app's server", async () => {
    vi.stubEnv('VITE_API_URL', '');
    const {ipAddress} = await import('@/lib/config');
    expect(await load()).toBe(`http://${ipAddress}:8080`);
  });
});

describe('i18n', () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage('vi'));
  });

  it('offers Vietnamese and English, Vietnamese by default', () => {
    expect(languages.map(l => l.code)).toEqual(['vi', 'en']);
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');
  });

  it('switching language updates <html lang> and is remembered', async () => {
    await act(() => i18n.changeLanguage('en'));

    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem('aloca.lang')).toBe('en');
  });

  it('uses the language part of a regional code and falls back to Vietnamese', async () => {
    await act(() => i18n.changeLanguage('en-US'));
    expect(i18n.resolvedLanguage).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    await act(() => i18n.changeLanguage('fr'));
    expect(i18n.resolvedLanguage).toBe('vi');
  });

  it('does not escape values (React does)', () => {
    expect(i18n.t('trips.list.deleteConfirm', {name: '<b>Đà Lạt</b>'})).toContain('<b>Đà Lạt</b>');
  });
});
