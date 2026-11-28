import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {reviewsApi, type Review, type ReviewsPage} from '@/features/destinations/reviews';
import DestinationPage from '@/features/destinations/pages/DestinationPage';
import {httpError, networkError, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/destinations/reviews', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/destinations/reviews')>()),
  reviewsApi: {list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn()},
}));

const DEST = 'Hà Giang';
const review = (id: string, rating: number, content: string, extra: Partial<Review> = {}): Review => ({
  _id: id,
  destination: DEST,
  rating,
  content,
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-01T09:00:00.000Z',
  author: {_id: `u-${id}`, username: `traveler-${id}`, image: null},
  mine: false,
  ...extra,
});
const page = (extra: Partial<ReviewsPage> = {}): ReviewsPage => ({
  destination: DEST,
  summary: {average: 4.5, count: 2},
  page: 1,
  limit: 10,
  total: 2,
  items: [review('r1', 5, 'Amazing loop'), review('r2', 4, 'Cold but beautiful')],
  myReview: null,
  ...extra,
});

const signIn = () => saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'me', role: 'user'}} as never);
const renderPage = () =>
  renderWithProviders(<DestinationPage />, {route: `/destination/${encodeURIComponent(DEST)}`, path: '/destination/:name'});
const stars = (n: number) => screen.getByRole('radio', {name: t('reviews.star', {count: n})});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('DestinationPage: reading', () => {
  it('shows the average, the number of reviews and every review, for a visitor who is not signed in', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page());
    renderPage();

    expect(await screen.findByRole('heading', {name: t('reviews.pageTitle', {place: DEST})})).toBeInTheDocument();
    expect(reviewsApi.list).toHaveBeenCalledWith(DEST, 1);
    expect(screen.getByLabelText(t('reviews.average'))).toHaveTextContent('4.5');
    expect(screen.getByText(t('reviews.count', {count: 2}))).toBeInTheDocument();
    expect(screen.getByText('Amazing loop')).toBeInTheDocument();
    expect(screen.getByText('traveler-r1')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('reviews.signIn')})).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('reviews.plansLink', {place: DEST})})).toHaveAttribute('href', `/explore?q=${encodeURIComponent(DEST)}`);
  });

  it('says there is no rating and no review yet', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page({summary: {average: null, count: 0}, total: 0, items: []}));
    renderPage();

    expect(await screen.findByText(t('reviews.noAverage'))).toBeInTheDocument();
    expect(screen.getByText(t('reviews.empty'))).toBeInTheDocument();
  });

  it('answers "not found" for a destination that does not exist', async () => {
    vi.mocked(reviewsApi.list).mockRejectedValue(httpError(404));
    renderPage();

    expect(await screen.findByText(t('reviews.notFoundTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('reviews.notFoundText'))).toBeInTheDocument();
  });

  it('offers a retry when the reviews cannot be loaded', async () => {
    vi.mocked(reviewsApi.list).mockRejectedValueOnce(networkError()).mockResolvedValue(page());
    renderPage();

    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText('Amazing loop')).toBeInTheDocument();
  });

  it('pages the reviews', async () => {
    vi.mocked(reviewsApi.list)
      .mockResolvedValueOnce(page({limit: 1, total: 2, items: [review('r1', 5, 'First review')]}))
      .mockResolvedValueOnce(page({page: 2, limit: 1, total: 2, items: [review('r2', 4, 'Second review')]}));
    renderPage();

    await screen.findByText('First review');
    expect(screen.getByRole('button', {name: t('reviews.prev')})).toBeDisabled();
    await userEvent.click(screen.getByRole('button', {name: t('reviews.next')}));

    expect(await screen.findByText('Second review')).toBeInTheDocument();
    expect(reviewsApi.list).toHaveBeenLastCalledWith(DEST, 2);
    expect(screen.getByRole('button', {name: t('reviews.next')})).toBeDisabled();
  });

  it('shows "edited" on a review that was changed after it was written', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(
      page({items: [review('r1', 5, 'Changed', {updatedAt: '2026-03-05T09:00:00.000Z'})]}),
    );
    renderPage();

    expect(await screen.findByText(new RegExp(t('reviews.edited')))).toBeInTheDocument();
  });
});

describe('DestinationPage: writing', () => {
  beforeEach(signIn);

  it('creates a review with the chosen stars and the comment, then shows the saved list', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValueOnce(page({summary: {average: null, count: 0}, total: 0, items: []})).mockResolvedValue(
      page({myReview: review('me1', 4, 'Lovely', {mine: true}), items: [review('me1', 4, 'Lovely', {mine: true})], summary: {average: 4, count: 1}, total: 1}),
    );
    vi.mocked(reviewsApi.create).mockResolvedValue({review: review('me1', 4, 'Lovely', {mine: true}), summary: {average: 4, count: 1}});
    renderPage();

    await screen.findByRole('form', {name: t('reviews.formTitle')});
    await userEvent.click(stars(4));
    await userEvent.type(screen.getByLabelText(t('reviews.commentLabel')), '  Lovely  ');
    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));

    await waitFor(() => expect(reviewsApi.create).toHaveBeenCalledWith(DEST, 4, 'Lovely'));
    expect(await screen.findByRole('region', {name: t('reviews.yourReview')})).toHaveTextContent('Lovely');
    // the form is replaced by "your review": one review per destination
    expect(screen.queryByRole('form', {name: t('reviews.formTitle')})).not.toBeInTheDocument();
  });

  it('asks for the stars and the comment before calling the API', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page());
    renderPage();
    await screen.findByRole('form', {name: t('reviews.formTitle')});

    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));

    expect(screen.getAllByRole('alert').map(node => node.textContent)).toEqual(
      expect.arrayContaining([t('reviews.errRating'), t('reviews.errContent')]),
    );
    expect(reviewsApi.create).not.toHaveBeenCalled();
  });

  it('counts the characters and refuses a comment that is too long', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page());
    renderPage();
    await screen.findByRole('form', {name: t('reviews.formTitle')});

    await userEvent.click(stars(5));
    await userEvent.click(screen.getByLabelText(t('reviews.commentLabel')));
    await userEvent.paste('a'.repeat(1001));
    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));

    expect(screen.getByText(t('reviews.counter', {count: 1001, max: 1000}))).toBeInTheDocument();
    expect(screen.getByText(t('reviews.errContentLong', {max: 1000}))).toBeInTheDocument();
    expect(reviewsApi.create).not.toHaveBeenCalled();
  });

  it('says so when the server finds a review of this destination already (409)', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page());
    vi.mocked(reviewsApi.create).mockRejectedValue(httpError(409));
    renderPage();
    await screen.findByRole('form', {name: t('reviews.formTitle')});

    await userEvent.click(stars(3));
    await userEvent.type(screen.getByLabelText(t('reviews.commentLabel')), 'Fine');
    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));

    expect(await screen.findByText(t('reviews.duplicate'))).toBeInTheDocument();
  });

  it('shows a generic error and the network error', async () => {
    vi.mocked(reviewsApi.list).mockResolvedValue(page());
    vi.mocked(reviewsApi.create).mockRejectedValueOnce(httpError(500)).mockRejectedValueOnce(networkError());
    renderPage();
    await screen.findByRole('form', {name: t('reviews.formTitle')});
    await userEvent.click(stars(3));
    await userEvent.type(screen.getByLabelText(t('reviews.commentLabel')), 'Fine');

    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));
    expect(await screen.findByText(t('reviews.failed'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('reviews.submit')}));
    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
  });

  describe('own review', () => {
    const mine = review('me1', 3, 'It was ok', {mine: true});
    const withMine = () => page({myReview: mine, items: [mine, review('r2', 5, 'Great')], total: 2});

    it('shows "your review" with Edit and Delete instead of the form, and not twice in the list', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      renderPage();

      const own = await screen.findByRole('region', {name: t('reviews.yourReview')});
      expect(within(own).getByText('It was ok')).toBeInTheDocument();
      expect(within(own).getByRole('button', {name: t('reviews.edit')})).toBeInTheDocument();
      expect(within(own).getByRole('button', {name: t('reviews.delete')})).toBeInTheDocument();
      expect(screen.getAllByText('It was ok')).toHaveLength(1);
      // the others' reviews have no buttons: only the author can change a review
      expect(screen.getAllByRole('button', {name: t('reviews.edit')})).toHaveLength(1);
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });

    it('edits the review: the form starts with the current values and saves them', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      vi.mocked(reviewsApi.update).mockResolvedValue({review: {...mine, rating: 5, content: 'Better'}, summary: {average: 5, count: 2}});
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.edit')}));
      expect(screen.getByRole('form', {name: t('reviews.editTitle')})).toBeInTheDocument();
      expect(screen.getByLabelText(t('reviews.commentLabel'))).toHaveValue('It was ok');
      expect(stars(3)).toBeChecked();
      await userEvent.click(stars(5));
      await userEvent.clear(screen.getByLabelText(t('reviews.commentLabel')));
      await userEvent.type(screen.getByLabelText(t('reviews.commentLabel')), 'Better');
      await userEvent.click(screen.getByRole('button', {name: t('reviews.update')}));

      await waitFor(() => expect(reviewsApi.update).toHaveBeenCalledWith('me1', 5, 'Better'));
      expect(reviewsApi.create).not.toHaveBeenCalled();
      expect(await screen.findByText(t('reviews.updated'))).toBeInTheDocument();
    });

    it('cancelling the edit keeps the review', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.edit')}));
      await userEvent.click(screen.getByRole('button', {name: t('reviews.cancel')}));

      expect(await screen.findByRole('region', {name: t('reviews.yourReview')})).toBeInTheDocument();
      expect(reviewsApi.update).not.toHaveBeenCalled();
    });

    it('says the review is not yours when the server answers 403', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      vi.mocked(reviewsApi.update).mockRejectedValue(httpError(403));
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.edit')}));
      await userEvent.click(screen.getByRole('button', {name: t('reviews.update')}));

      expect(await screen.findByText(t('reviews.notAllowed'))).toBeInTheDocument();
    });

    it('deleting asks first, then removes the review and shows the form again', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValueOnce(withMine()).mockResolvedValue(page({items: [review('r2', 5, 'Great')], total: 1}));
      vi.mocked(reviewsApi.remove).mockResolvedValue({summary: {average: 5, count: 1}});
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.delete')}));
      expect(reviewsApi.remove).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', {name: t('reviews.deleteAction')}));

      await waitFor(() => expect(reviewsApi.remove).toHaveBeenCalledWith('me1'));
      expect(await screen.findByText(t('reviews.deleted'))).toBeInTheDocument();
      expect(await screen.findByRole('form', {name: t('reviews.formTitle')})).toBeInTheDocument();
    });

    it('cancelling the deletion keeps the review', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.delete')}));
      await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));

      expect(reviewsApi.remove).not.toHaveBeenCalled();
    });

    it('shows an error when the review cannot be deleted', async () => {
      vi.mocked(reviewsApi.list).mockResolvedValue(withMine());
      vi.mocked(reviewsApi.remove).mockRejectedValue(httpError(500));
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('reviews.delete')}));
      await userEvent.click(screen.getByRole('button', {name: t('reviews.deleteAction')}));

      expect(await screen.findByText(t('reviews.deleteFailed'))).toBeInTheDocument();
    });
  });
});
