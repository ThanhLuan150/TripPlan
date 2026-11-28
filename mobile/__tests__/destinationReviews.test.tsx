import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {reviewsApi, Review, ReviewsPage} from '../src/api';
import {subscribeAlert} from '../src/lib/alert';
import {StarDisplay, StarInput} from '../src/components/StarRating';
import DestinationReviews from '../src/screens/DestinationReviews';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, render, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  reviewsApi: {list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
const api = reviewsApi as unknown as Record<string, jest.Mock>;
type Tree = ReturnType<typeof renderApp>;

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

const buttons = (tree: Tree, label: string) =>
  tree.root.findAllByType(TouchableOpacity).filter(n => n.props.accessibilityLabel === label);
const star = (tree: Tree, n: number) => tree.root.findAll(n2 => n2.props.accessibilityRole === 'radio' && n2.props.accessibilityLabel === t('reviews.star', {count: n}))[0];
const comment = (tree: Tree) => tree.root.findAllByType(TextInput)[0];
const write = (tree: Tree, text: string) => act(() => comment(tree).props.onChangeText(text));
const tap = async (tree: Tree, label: string) => {
  press(buttons(tree, label)[0]);
  await flush();
};
const open = async () => {
  const tree = renderApp(<DestinationReviews />);
  await flush();
  return tree;
};

let alerts: any[] = [];
let stop: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav({destination: DEST});
  alerts = [];
  stop = subscribeAlert(a => alerts.push(a));
});
afterEach(() => stop());

describe('DestinationReviews: reading', () => {
  it('shows the average, the number of reviews and every review', async () => {
    api.list.mockResolvedValue(page());
    const tree = await open();

    expect(api.list).toHaveBeenCalledWith(DEST, 1);
    expect(allText(tree)).toContain(t('reviews.title', {place: DEST}));
    expect(allText(tree)).toContain('4.5');
    expect(allText(tree)).toContain(t('reviews.count', {count: 2}));
    expect(allText(tree)).toContain('Amazing loop');
    expect(allText(tree)).toContain('traveler-r1');
  });

  it('says there is no rating and no review yet, and offers the form', async () => {
    api.list.mockResolvedValue(page({summary: {average: null, count: 0}, total: 0, items: []}));
    const tree = await open();

    expect(allText(tree)).toContain(t('reviews.noAverage'));
    expect(allText(tree)).toContain(t('reviews.empty'));
    expect(allText(tree)).toContain(t('reviews.formTitle'));
  });

  it('answers "not found" for a destination that does not exist', async () => {
    api.list.mockRejectedValue({response: {status: 404, data: {}}});
    const tree = await open();

    expect(allText(tree)).toContain(t('reviews.notFound'));
  });

  it('shows an error when the reviews cannot be loaded', async () => {
    api.list.mockRejectedValue({response: {status: 500, data: {}}});
    const tree = await open();

    expect(allText(tree)).toContain(t('reviews.loadFailed'));
  });

  it('loads the next page on demand', async () => {
    api.list
      .mockResolvedValueOnce(page({limit: 1, total: 2, items: [review('r1', 5, 'First review')]}))
      .mockResolvedValueOnce(page({page: 2, limit: 1, total: 2, items: [review('r2', 4, 'Second review')]}));
    const tree = await open();

    pressText(tree, t('reviews.more'));
    await flush();

    expect(api.list).toHaveBeenLastCalledWith(DEST, 2);
    expect(allText(tree)).toContain('First review');
    expect(allText(tree)).toContain('Second review');
    expect(allText(tree)).not.toContain(t('reviews.more'));
  });

  it('shows "edited" on a review that was changed after it was written', async () => {
    api.list.mockResolvedValue(page({items: [review('r1', 5, 'Changed', {updatedAt: '2026-03-05T09:00:00.000Z'})]}));
    const tree = await open();

    expect(allText(tree)).toContain(t('reviews.edited'));
  });

  it('goes back', async () => {
    api.list.mockResolvedValue(page());
    const tree = await open();

    press(tree.root.findAllByType(TouchableOpacity)[0]);

    expect(nav.goBack).toHaveBeenCalled();
  });
});

describe('DestinationReviews: writing', () => {
  it('creates a review with the chosen stars and the comment, then shows it as "your review"', async () => {
    const mine = review('me1', 4, 'Lovely', {mine: true});
    api.list
      .mockResolvedValueOnce(page({summary: {average: null, count: 0}, total: 0, items: []}))
      .mockResolvedValue(page({myReview: mine, items: [mine], summary: {average: 4, count: 1}, total: 1}));
    api.create.mockResolvedValue({review: mine, summary: {average: 4, count: 1}});
    const tree = await open();

    press(star(tree, 4));
    write(tree, '  Lovely  ');
    await tap(tree, t('reviews.submit'));

    expect(api.create).toHaveBeenCalledWith(DEST, 4, 'Lovely');
    expect(allText(tree)).toContain(t('reviews.yourReview'));
    // one review per destination: the form is gone
    expect(allText(tree)).not.toContain(t('reviews.formTitle'));
    expect(alerts.some(a => a.message === t('reviews.created'))).toBe(true);
  });

  it('asks for the stars and the comment before calling the API', async () => {
    api.list.mockResolvedValue(page());
    const tree = await open();

    await tap(tree, t('reviews.submit'));

    expect(allText(tree)).toContain(t('reviews.errRating'));
    expect(allText(tree)).toContain(t('reviews.errContent'));
    expect(api.create).not.toHaveBeenCalled();
  });

  it('counts the characters and refuses a comment that is too long', async () => {
    api.list.mockResolvedValue(page());
    const tree = await open();

    press(star(tree, 5));
    write(tree, 'a'.repeat(1001));
    await tap(tree, t('reviews.submit'));

    expect(allText(tree)).toContain(t('reviews.counter', {count: 1001, max: 1000}));
    expect(allText(tree)).toContain(t('reviews.errContentLong', {max: 1000}));
    expect(api.create).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'reviews.duplicate'],
    [500, 'reviews.failed'],
  ])('shows the right message for a %s answer', async (status, key) => {
    api.list.mockResolvedValue(page());
    api.create.mockRejectedValue({response: {status, data: {}}});
    const tree = await open();

    press(star(tree, 3));
    write(tree, 'Fine');
    await tap(tree, t('reviews.submit'));

    expect(allText(tree)).toContain(t(key));
  });

  it('shows the network error when the server cannot be reached', async () => {
    api.list.mockResolvedValue(page());
    api.create.mockRejectedValue(new Error('Network Error'));
    const tree = await open();

    press(star(tree, 3));
    write(tree, 'Fine');
    await tap(tree, t('reviews.submit'));

    expect(allText(tree)).toContain(t('common.network'));
  });
});

describe('DestinationReviews: own review', () => {
  const mine = review('me1', 3, 'It was ok', {mine: true});
  const withMine = () => page({myReview: mine, items: [mine, review('r2', 5, 'Great')], total: 2});

  it('shows "your review" with Edit and Delete instead of the form, and not twice in the list', async () => {
    api.list.mockResolvedValue(withMine());
    const tree = await open();

    expect(allText(tree)).toContain(t('reviews.yourReview'));
    expect(buttons(tree, t('reviews.edit'))).toHaveLength(1);
    expect(buttons(tree, t('reviews.delete'))).toHaveLength(1);
    expect(allText(tree).split('It was ok')).toHaveLength(2);
    expect(allText(tree)).not.toContain(t('reviews.formTitle'));
  });

  it('edits the review: the form starts with the current values and saves them', async () => {
    api.list.mockResolvedValue(withMine());
    api.update.mockResolvedValue({review: {...mine, rating: 5, content: 'Better'}, summary: {average: 5, count: 2}});
    const tree = await open();

    await tap(tree, t('reviews.edit'));
    expect(allText(tree)).toContain(t('reviews.editTitle'));
    expect(comment(tree).props.value).toBe('It was ok');
    expect(star(tree, 3).props.accessibilityState).toEqual({checked: true});
    press(star(tree, 5));
    write(tree, 'Better');
    await tap(tree, t('reviews.update'));

    expect(api.update).toHaveBeenCalledWith('me1', 5, 'Better');
    expect(api.create).not.toHaveBeenCalled();
    expect(alerts.some(a => a.message === t('reviews.updated'))).toBe(true);
  });

  it('cancelling the edit keeps the review', async () => {
    api.list.mockResolvedValue(withMine());
    const tree = await open();

    await tap(tree, t('reviews.edit'));
    await tap(tree, t('reviews.cancel'));

    expect(allText(tree)).toContain(t('reviews.yourReview'));
    expect(api.update).not.toHaveBeenCalled();
  });

  it('says the review is not yours when the server answers 403', async () => {
    api.list.mockResolvedValue(withMine());
    api.update.mockRejectedValue({response: {status: 403, data: {}}});
    const tree = await open();

    await tap(tree, t('reviews.edit'));
    await tap(tree, t('reviews.update'));

    expect(allText(tree)).toContain(t('reviews.notAllowed'));
  });

  it('deleting asks first, then removes the review and shows the form again', async () => {
    api.list.mockResolvedValueOnce(withMine()).mockResolvedValue(page({items: [review('r2', 5, 'Great')], total: 1}));
    api.remove.mockResolvedValue({summary: {average: 5, count: 1}});
    const tree = await open();

    await tap(tree, t('reviews.delete'));
    expect(api.remove).not.toHaveBeenCalled();
    expect(allText(tree)).toContain(t('reviews.deleteTitle'));
    pressText(tree, t('reviews.delete'), 'last');
    await flush();

    expect(api.remove).toHaveBeenCalledWith('me1');
    expect(alerts.some(a => a.message === t('reviews.deleted'))).toBe(true);
    expect(allText(tree)).toContain(t('reviews.formTitle'));
  });

  it('cancelling the deletion keeps the review', async () => {
    api.list.mockResolvedValue(withMine());
    const tree = await open();

    await tap(tree, t('reviews.delete'));
    pressText(tree, t('common.cancel'));
    await flush();

    expect(api.remove).not.toHaveBeenCalled();
  });

  it('tells the user when the review cannot be deleted', async () => {
    api.list.mockResolvedValue(withMine());
    api.remove.mockRejectedValue({response: {status: 500, data: {}}});
    const tree = await open();

    await tap(tree, t('reviews.delete'));
    pressText(tree, t('reviews.delete'), 'last');
    await flush();

    expect(alerts.some(a => a.title === t('reviews.deleteFailed'))).toBe(true);
  });
});

describe('StarRating', () => {
  it('StarDisplay is an image whose label says the rating', () => {
    const tree = render(<StarDisplay value={4} />);

    expect(tree.root.findAll(n => n.props.accessibilityRole === 'image' && n.props.accessibilityLabel === t('reviews.starsOf', {count: 4})).length).toBeGreaterThan(0);
  });

  it('StarInput shows five radio buttons with the chosen one checked and chooses with a tap', () => {
    const onChange = jest.fn();
    const tree = render(<StarInput value={3} onChange={onChange} />);
    const radios = tree.root.findAllByType(TouchableOpacity);

    expect(radios).toHaveLength(5);
    expect(radios[2].props.accessibilityState).toEqual({checked: true});
    expect(radios[3].props.accessibilityState).toEqual({checked: false});
    press(radios[4]);
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
