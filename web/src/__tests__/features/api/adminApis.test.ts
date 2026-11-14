// The admin API modules call the right endpoint with the right body and unwrap
// the response. (setup.ts mocks them for the page tests: the real ones are loaded here.)
import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {api} from '@/lib/apiClient';

const admin = await vi.importActual<typeof import('@/features/admin/api')>('@/features/admin/api');
const users = await vi.importActual<typeof import('@/features/admin/users/api')>('@/features/admin/users/api');

const reply = (data: unknown) => ({data}) as never;
let get: MockInstance<typeof api.get>;
let post: MockInstance<typeof api.post>;
let patch: MockInstance<typeof api.patch>;
let put: MockInstance<typeof api.put>;
let del: MockInstance<typeof api.delete>;

beforeEach(() => {
  get = vi.spyOn(api, 'get').mockResolvedValue(reply({ok: true}));
  post = vi.spyOn(api, 'post').mockResolvedValue(reply({ok: true}));
  patch = vi.spyOn(api, 'patch').mockResolvedValue(reply({ok: true}));
  put = vi.spyOn(api, 'put').mockResolvedValue(reply({ok: true}));
  del = vi.spyOn(api, 'delete').mockResolvedValue(reply({ok: true}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin API', () => {
  it.each([
    ['fetchDashboard', '/admin/dashboard'],
    ['fetchAlerts', '/admin/alerts'],
    ['fetchTrips', '/admin/trips'],
    ['fetchChallenges', '/admin/challenges'],
    ['fetchAi', '/admin/ai'],
    ['fetchLogs', '/admin/logs'],
    ['fetchModeration', '/admin/moderation'],
    ['fetchVideos', '/admin/videos'],
    ['fetchAnnouncements', '/admin/announcements'],
    ['fetchSettings', '/admin/settings'],
    ['fetchShowcase', '/admin/showcase'],
    ['fetchRoles', '/admin/roles'],
  ] as const)('%s reads %s', async (name, url) => {
    await expect(admin[name]()).resolves.toEqual({ok: true});
    expect(get).toHaveBeenCalledWith(url, {params: undefined});
  });

  it('fetchReport sends the period', async () => {
    await admin.fetchReport('7d');
    expect(get).toHaveBeenCalledWith('/admin/reports', {params: {period: '7d'}});
  });

  it('deletes trips, challenges, videos and announcements', async () => {
    await admin.deleteTrip('t1');
    await admin.deleteChallenge('c1');
    await admin.deleteVideo('v1');
    await admin.deleteAnnouncement('a1');
    await admin.deleteShowcase('s1');

    expect(del.mock.calls.map(([url]) => url)).toEqual([
      '/admin/trips/t1',
      '/admin/challenges/c1',
      '/admin/videos/v1',
      '/admin/announcements/a1',
      '/admin/showcase/s1',
    ]);
  });

  it('edits challenges, decides moderation, saves settings', async () => {
    await admin.patchChallenge('c1', {points: 5});
    await admin.decideModeration('r1', 'approved');
    await admin.putSettings({hotline: '1900'});

    expect(patch).toHaveBeenCalledWith('/admin/challenges/c1', {points: 5});
    expect(patch).toHaveBeenCalledWith('/admin/moderation/r1', {status: 'approved'});
    expect(put).toHaveBeenCalledWith('/admin/settings', {hotline: '1900'});
  });

  it('creates and edits videos and announcements', async () => {
    await admin.postVideo({title: 'A'});
    await admin.patchVideo('v1', {title: 'B'});
    await admin.postAnnouncement({title: 'A'});
    await admin.patchAnnouncement('a1', {title: 'B'});

    await admin.postShowcase({kind: 'banner'});
    await admin.patchShowcase('s1', {title: 'B'});

    expect(post).toHaveBeenCalledWith('/admin/showcase', {kind: 'banner'});
    expect(patch).toHaveBeenCalledWith('/admin/showcase/s1', {title: 'B'});
    expect(post).toHaveBeenCalledWith('/admin/videos', {title: 'A'});
    expect(patch).toHaveBeenCalledWith('/admin/videos/v1', {title: 'B'});
    expect(post).toHaveBeenCalledWith('/admin/announcements', {title: 'A'});
    expect(patch).toHaveBeenCalledWith('/admin/announcements/a1', {title: 'B'});
  });
});

describe('admin users API', () => {
  it('reads the list, one account and one trip', async () => {
    await users.fetchUsers();
    await users.fetchUser('u1');
    await users.fetchTrip('t1');

    expect(get.mock.calls.map(([url]) => url)).toEqual(['/admin/users', '/admin/users/u1', '/admin/trips/t1']);
  });

  it('creates, edits and changes the state of accounts', async () => {
    await users.postUser({fullname: 'An', username: 'an', email: 'a@b.vn', role: 'user', password: '12345678'});
    await users.patchUser('u1', {role: 'admin'});
    await expect(users.patchUsersStatus(['u1', 'u2'], 'suspended', 'Spam')).resolves.toEqual({ok: true});

    expect(post).toHaveBeenCalledWith('/admin/users', expect.objectContaining({username: 'an'}));
    expect(patch).toHaveBeenCalledWith('/admin/users/u1', {role: 'admin'});
    expect(post).toHaveBeenCalledWith('/admin/users/bulk-status', {ids: ['u1', 'u2'], status: 'suspended', suspendReason: 'Spam'});
  });
});
