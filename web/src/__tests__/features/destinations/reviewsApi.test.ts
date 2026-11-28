import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import {api} from '@/lib/apiClient';
import {reviewsApi} from '@/features/destinations/reviews';

const reply = (data: unknown) => ({data}) as never;
let get: MockInstance<typeof api.get>;
let post: MockInstance<typeof api.post>;
let put: MockInstance<typeof api.put>;
let del: MockInstance<typeof api.delete>;

beforeEach(() => {
  get = vi.spyOn(api, 'get');
  post = vi.spyOn(api, 'post');
  put = vi.spyOn(api, 'put');
  del = vi.spyOn(api, 'delete');
});

afterEach(() => vi.restoreAllMocks());

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
