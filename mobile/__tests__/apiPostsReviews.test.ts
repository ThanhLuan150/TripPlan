import {reviewsApi, tripsApi} from '../src/api';
import {api} from '../src/lib/apiClient';

const get = jest.spyOn(api, 'get');
const post = jest.spyOn(api, 'post');
const put = jest.spyOn(api, 'put');
const del = jest.spyOn(api, 'delete');
const reply = (data: unknown) => ({data} as any);

afterEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

describe('tripsApi: search, share as a post, report', () => {
  it('search: the keyword is sent only when there is one', async () => {
    get.mockResolvedValue(reply({q: 'lat', page: 2, limit: 12, total: 13, items: []}));

    await expect(tripsApi.listPublic(2, 'lat')).resolves.toMatchObject({total: 13});
    expect(get).toHaveBeenLastCalledWith('/public-trip', {params: {page: 2, q: 'lat'}});
    await tripsApi.listPublic(1);
    expect(get).toHaveBeenLastCalledWith('/public-trip', {params: {page: 1}});
    await tripsApi.listPublic(1, '');
    expect(get).toHaveBeenLastCalledWith('/public-trip', {params: {page: 1}});
  });

  it('share as a post: status, share with the introduction, remove', async () => {
    const status = {isPosted: true, visibility: 'public', content: 'Hi', postedAt: '2026-01-01'};
    get.mockResolvedValue(reply(status));
    post.mockResolvedValue(reply(status));
    del.mockResolvedValue(reply({...status, isPosted: false}));

    await expect(tripsApi.postStatus('t1')).resolves.toEqual(status);
    await expect(tripsApi.sharePost('t1', 'Hi')).resolves.toEqual(status);
    await expect(tripsApi.removePost('t1')).resolves.toMatchObject({isPosted: false});
    expect(get).toHaveBeenCalledWith('/trip-plan/t1/post');
    expect(post).toHaveBeenCalledWith('/trip-plan/t1/post', {content: 'Hi'});
    expect(del).toHaveBeenCalledWith('/trip-plan/t1/post');
  });

  it('report a post: the reason, and the description only when there is one', async () => {
    post.mockResolvedValue(reply({message: 'Report sent successfully'}));

    await expect(tripsApi.reportPost('t1', 'spam')).resolves.toEqual({message: 'Report sent successfully'});
    expect(post).toHaveBeenLastCalledWith('/public-trip/t1/report', {reason: 'spam'});
    await tripsApi.reportPost('t1', 'other', 'Rude');
    expect(post).toHaveBeenLastCalledWith('/public-trip/t1/report', {reason: 'other', description: 'Rude'});
  });
});

describe('reviewsApi', () => {
  it('lists the reviews of a destination with the page', async () => {
    get.mockResolvedValue(reply({destination: 'Hà Giang', items: []}));

    await expect(reviewsApi.list('Hà Giang', 2)).resolves.toEqual({destination: 'Hà Giang', items: []});
    expect(get).toHaveBeenCalledWith('/destination-reviews', {params: {destination: 'Hà Giang', page: 2}});
  });

  it('creates, updates and deletes a review', async () => {
    const result = {review: {_id: 'r1'}, summary: {average: 4, count: 1}};
    post.mockResolvedValue(reply(result));
    put.mockResolvedValue(reply(result));
    del.mockResolvedValue(reply({summary: {average: null, count: 0}}));

    await expect(reviewsApi.create('Hà Giang', 4, 'Đẹp')).resolves.toEqual(result);
    await expect(reviewsApi.update('r1', 5, 'Rất đẹp')).resolves.toEqual(result);
    await expect(reviewsApi.remove('r1')).resolves.toEqual({summary: {average: null, count: 0}});

    expect(post).toHaveBeenCalledWith('/destination-reviews', {destination: 'Hà Giang', rating: 4, content: 'Đẹp'});
    expect(put).toHaveBeenCalledWith('/destination-reviews/r1', {rating: 5, content: 'Rất đẹp'});
    expect(del).toHaveBeenCalledWith('/destination-reviews/r1');
  });
});
