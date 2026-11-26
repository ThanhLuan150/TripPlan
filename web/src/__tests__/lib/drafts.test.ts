import {beforeEach, describe, expect, it} from 'vitest';
import {drafts} from '@/lib/drafts';

beforeEach(() => window.localStorage.clear());

describe('drafts', () => {
  it('saves, loads and clears a draft', () => {
    expect(drafts.load('x')).toBeNull();
    drafts.save('x', {a: 1});
    expect(drafts.load<{a: number}>('x')?.value).toEqual({a: 1});
    expect(window.localStorage.getItem('draft:x:anonymous')).not.toBeNull();
    drafts.clear('x');
    expect(drafts.load('x')).toBeNull();
  });

  it('keeps one draft per account: another user of the same browser never sees it', () => {
    window.localStorage.setItem('user', JSON.stringify({accessToken: 't', data: {username: 'lan123'}}));
    drafts.save('x', {a: 1});
    expect(window.localStorage.getItem('draft:x:lan123')).not.toBeNull();

    window.localStorage.setItem('user', JSON.stringify({accessToken: 't', data: {username: 'minh456'}}));
    expect(drafts.load('x')).toBeNull();
    window.localStorage.setItem('user', JSON.stringify({accessToken: 't', data: {username: 'lan123'}}));
    expect(drafts.load<{a: number}>('x')?.value).toEqual({a: 1});
  });

  it('ignores an unreadable draft or user', () => {
    window.localStorage.setItem('draft:y:anonymous', '{not json');
    expect(drafts.load('y')).toBeNull();
    window.localStorage.setItem('draft:z:anonymous', JSON.stringify({value: 1}));
    expect(drafts.load('z')).toBeNull();
    window.localStorage.setItem('user', 'not json');
    drafts.save('y', 1);
    expect(window.localStorage.getItem('draft:y:anonymous')).toContain('"value":1');
  });
});
