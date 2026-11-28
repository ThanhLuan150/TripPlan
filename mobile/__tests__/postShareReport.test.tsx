import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import {subscribeAlert} from '../src/lib/alert';
import ReportPostModal from '../src/components/ReportPostModal';
import SharePostModal from '../src/components/SharePostModal';
import PublicTripDetail from '../src/screens/PublicTripDetail';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {
    getPublic: jest.fn(),
    copyPublic: jest.fn(),
    likePublic: jest.fn(),
    unlikePublic: jest.fn(),
    savePost: jest.fn(),
    unsavePost: jest.fn(),
    postStatus: jest.fn(),
    sharePost: jest.fn(),
    removePost: jest.fn(),
    reportPost: jest.fn(),
    visibility: jest.fn(),
  },
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
const api = tripsApi as unknown as Record<string, jest.Mock>;
type Tree = ReturnType<typeof renderApp>;

const off = {isPosted: false, visibility: 'private', content: '', postedAt: null};
const on = {isPosted: true, visibility: 'public', content: 'Old intro', postedAt: '2026-01-01'};

const byLabel = (tree: Tree, label: string) =>
  tree.root.findAllByType(TouchableOpacity).filter(n => n.props.accessibilityLabel === label);
const field = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.type === TextInput)[0];
const type = (tree: Tree, label: string, text: string) => act(() => field(tree, label).props.onChangeText(text));
const tap = async (tree: Tree, label: string) => {
  press(byLabel(tree, label)[0]);
  await flush();
};

let alerts: any[] = [];
let stop: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav({id: 't1'});
  alerts = [];
  stop = subscribeAlert(a => alerts.push(a));
});
afterEach(() => stop());

describe('SharePostModal', () => {
  const open = async () => {
    const onClose = jest.fn();
    const tree = renderApp(<SharePostModal tripId="t1" visible onClose={onClose} />);
    await flush();
    return {tree, onClose};
  };
  const introLabel = t('trips.postContentLabel');

  it('explains that posting makes the plan public and shows it is not a post yet', async () => {
    api.postStatus.mockResolvedValue(off);
    const {tree} = await open();

    expect(api.postStatus).toHaveBeenCalledWith('t1');
    expect(allText(tree)).toContain(t('trips.postNotPosted'));
    expect(allText(tree)).toContain(t('trips.postNotice'));
    expect(byLabel(tree, t('trips.postShare'))).toHaveLength(1);
    expect(byLabel(tree, t('trips.postRemove'))).toHaveLength(0);
  });

  it('does not load anything while it is closed', async () => {
    renderApp(<SharePostModal tripId="t1" visible={false} onClose={jest.fn()} />);
    await flush();

    expect(api.postStatus).not.toHaveBeenCalled();
  });

  it('shares the plan with the introduction that was typed (trimmed) and shows the post status', async () => {
    api.postStatus.mockResolvedValue(off);
    api.sharePost.mockResolvedValue({...on, content: 'Hello'});
    const {tree} = await open();

    type(tree, introLabel, '  Hello  ');
    await tap(tree, t('trips.postShare'));

    expect(api.sharePost).toHaveBeenCalledWith('t1', 'Hello');
    expect(allText(tree)).toContain(t('trips.postPosted'));
    expect(alerts.some(a => a.message === t('trips.postSharedOk'))).toBe(true);
  });

  it('the introduction is optional', async () => {
    api.postStatus.mockResolvedValue(off);
    api.sharePost.mockResolvedValue(on);
    const {tree} = await open();

    await tap(tree, t('trips.postShare'));

    expect(api.sharePost).toHaveBeenCalledWith('t1', '');
  });

  it('a plan that is already a post shows its introduction and updates it', async () => {
    api.postStatus.mockResolvedValue(on);
    api.sharePost.mockResolvedValue({...on, content: 'New intro'});
    const {tree} = await open();

    expect(field(tree, introLabel).props.value).toBe('Old intro');
    type(tree, introLabel, 'New intro');
    await tap(tree, t('trips.postUpdate'));

    expect(api.sharePost).toHaveBeenCalledWith('t1', 'New intro');
    expect(alerts.some(a => a.message === t('trips.postUpdatedOk'))).toBe(true);
  });

  it('refuses an introduction that is too long without calling the API', async () => {
    api.postStatus.mockResolvedValue(off);
    const {tree} = await open();

    type(tree, introLabel, 'a'.repeat(1001));

    expect(allText(tree)).toContain(t('trips.postTooLong', {max: 1000}));
    expect(allText(tree)).toContain(t('trips.postCounter', {count: 1001, max: 1000}));
    expect(byLabel(tree, t('trips.postShare'))[0].props.disabled).toBe(true);
    expect(api.sharePost).not.toHaveBeenCalled();
  });

  it('says the plan needs a day when the server refuses an empty plan', async () => {
    api.postStatus.mockResolvedValue(off);
    api.sharePost.mockRejectedValue({response: {status: 400, data: {message: 'Add at least one day to the trip before sharing it'}}});
    const {tree} = await open();

    await tap(tree, t('trips.postShare'));

    expect(alerts.some(a => a.message === t('trips.postNoDays'))).toBe(true);
    expect(allText(tree)).toContain(t('trips.postNotPosted'));
  });

  it('shows the server message for any other failure', async () => {
    api.postStatus.mockResolvedValue(off);
    api.sharePost.mockRejectedValue({response: {status: 500, data: {message: 'boom'}}});
    const {tree} = await open();

    await tap(tree, t('trips.postShare'));

    expect(alerts.some(a => a.message === 'boom')).toBe(true);
  });

  it('removing the post asks first, then makes the plan private again', async () => {
    api.postStatus.mockResolvedValue(on);
    api.removePost.mockResolvedValue(off);
    const {tree} = await open();

    await tap(tree, t('trips.postRemove'));
    expect(api.removePost).not.toHaveBeenCalled();
    expect(allText(tree)).toContain(t('trips.postRemoveConfirm'));
    // the confirmation has its own "Remove post" button (the last one)
    pressText(tree, t('trips.postRemove'), 'last');
    await flush();

    expect(api.removePost).toHaveBeenCalledWith('t1');
    expect(allText(tree)).toContain(t('trips.postNotPosted'));
    expect(byLabel(tree, t('trips.postRemove'))).toHaveLength(0);
  });

  it('cancelling the removal keeps the post', async () => {
    api.postStatus.mockResolvedValue(on);
    const {tree} = await open();

    await tap(tree, t('trips.postRemove'));
    pressText(tree, t('common.cancel'));
    await flush();

    expect(api.removePost).not.toHaveBeenCalled();
    expect(allText(tree)).toContain(t('trips.postPosted'));
  });

  it('tells the user when the post cannot be removed', async () => {
    api.postStatus.mockResolvedValue(on);
    api.removePost.mockRejectedValue({response: {status: 500, data: {message: 'boom'}}});
    const {tree} = await open();

    await tap(tree, t('trips.postRemove'));
    pressText(tree, t('trips.postRemove'), 'last');
    await flush();

    expect(alerts.some(a => a.title === t('trips.postRemoveFailed'))).toBe(true);
    expect(allText(tree)).toContain(t('trips.postPosted'));
  });

  it('says so when the status cannot be loaded, and closes', async () => {
    api.postStatus.mockRejectedValue({response: {status: 500, data: {}}});
    const {tree, onClose} = await open();

    expect(allText(tree)).toContain(t('trips.postLoadFailed'));
    pressText(tree, t('common.close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ReportPostModal', () => {
  const open = () => {
    const onClose = jest.fn();
    const tree = renderApp(<ReportPostModal tripId="t1" visible onClose={onClose} />);
    return {tree, onClose};
  };
  const reason = (tree: Tree, key: string) => byLabel(tree, t(`trips.reportReasons.${key}`))[0];
  const descLabel = t('trips.reportDescription');

  it('shows the list of reasons with "spam" chosen, and the privacy note', () => {
    const {tree} = open();

    for (const key of ['spam', 'inappropriate', 'wrongLocation', 'copyright', 'misinformation', 'other']) {
      expect(reason(tree, key)).toBeDefined();
    }
    expect(reason(tree, 'spam').props.accessibilityState).toEqual({checked: true});
    expect(reason(tree, 'other').props.accessibilityState).toEqual({checked: false});
    expect(allText(tree)).toContain(t('trips.reportSubtitle'));
  });

  it('sends the chosen reason with the description and shows the thank you', async () => {
    api.reportPost.mockResolvedValue({message: 'ok'});
    const {tree} = open();

    press(reason(tree, 'inappropriate'));
    type(tree, descLabel, '  Rude photos ');
    await tap(tree, t('trips.reportSubmit'));

    expect(api.reportPost).toHaveBeenCalledWith('t1', 'inappropriate', 'Rude photos');
    expect(allText(tree)).toContain(t('trips.reportSent'));
    expect(allText(tree)).toContain(t('trips.reportSentText'));
  });

  it('the description can stay empty (nothing is sent for it)', async () => {
    api.reportPost.mockResolvedValue({message: 'ok'});
    const {tree} = open();

    await tap(tree, t('trips.reportSubmit'));

    expect(api.reportPost).toHaveBeenCalledWith('t1', 'spam', undefined);
  });

  it('the reason "other" needs a description', async () => {
    api.reportPost.mockResolvedValue({message: 'ok'});
    const {tree} = open();

    press(reason(tree, 'other'));
    await tap(tree, t('trips.reportSubmit'));
    expect(allText(tree)).toContain(t('trips.reportDescriptionRequired'));
    expect(api.reportPost).not.toHaveBeenCalled();

    type(tree, descLabel, 'Something else');
    await tap(tree, t('trips.reportSubmit'));
    expect(api.reportPost).toHaveBeenCalledWith('t1', 'other', 'Something else');
  });

  it('refuses a description that is too long without calling the API', async () => {
    const {tree} = open();

    type(tree, descLabel, 'a'.repeat(501));

    expect(allText(tree)).toContain(t('trips.reportTooLong', {max: 500}));
    expect(byLabel(tree, t('trips.reportSubmit'))[0].props.disabled).toBe(true);
    expect(api.reportPost).not.toHaveBeenCalled();
  });

  it.each([
    [409, {message: 'You already reported this post'}, 'trips.reportDuplicate'],
    [404, {message: 'Post not found'}, 'trips.reportUnavailable'],
    [400, {message: 'You cannot report your own post'}, 'trips.reportOwn'],
    [500, {}, 'trips.reportFailed'],
  ])('shows the right message for a %s answer', async (status, data, key) => {
    api.reportPost.mockRejectedValue({response: {status, data}});
    const {tree} = open();

    await tap(tree, t('trips.reportSubmit'));

    expect(allText(tree)).toContain(t(key));
    expect(allText(tree)).not.toContain(t('trips.reportSent'));
  });

  it('shows the network error when the server cannot be reached', async () => {
    api.reportPost.mockRejectedValue(new Error('Network Error'));
    const {tree} = open();

    await tap(tree, t('trips.reportSubmit'));

    expect(allText(tree)).toContain(t('common.network'));
  });

  it('cancel closes the dialog without sending anything and the next report starts clean', async () => {
    const {tree, onClose} = open();
    press(reason(tree, 'copyright'));

    pressText(tree, t('common.cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(api.reportPost).not.toHaveBeenCalled();
    expect(reason(tree, 'spam').props.accessibilityState).toEqual({checked: true});
  });
});

describe('PublicTripDetail: post and report', () => {
  const trip = {
    nameTrip: 'Hà Giang loop',
    location: 'Hà Giang',
    startDate: '2026-03-02T09:00:00',
    endDate: '2026-03-04T09:00:00',
    postContent: 'Four days on the Ha Giang loop.',
    dataTripDays: [{title: 'Day one', date: '2026-03-02T09:00:00', challenges: [{_id: 'c1', challengeSummary: 'Mã Pí Lèng', points: 20}]}],
  };

  it('shows the introduction of the author with the plan', async () => {
    api.getPublic.mockResolvedValue(trip);
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    expect(allText(tree)).toContain(t('trips.publicAuthorNote'));
    expect(allText(tree)).toContain('Four days on the Ha Giang loop.');
  });

  it('shows no introduction block for a plan without one', async () => {
    api.getPublic.mockResolvedValue({...trip, postContent: undefined});
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    expect(allText(tree)).not.toContain(t('trips.publicAuthorNote'));
  });

  it('opens the reviews of the destination of the plan', async () => {
    api.getPublic.mockResolvedValue(trip);
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    press(byLabel(tree, t('trips.publicReviewsLink', {place: 'Hà Giang'}))[0]);

    expect(nav.navigate).toHaveBeenCalledWith('DestinationReviews', {destination: 'Hà Giang'});
  });

  it('opens the report dialog from the plan and sends a report', async () => {
    api.getPublic.mockResolvedValue(trip);
    api.reportPost.mockResolvedValue({message: 'ok'});
    const tree = renderApp(<PublicTripDetail />);
    await flush();
    expect(allText(tree)).not.toContain(t('trips.reportTitle'));

    press(byLabel(tree, t('trips.reportOpen'))[0]);
    expect(allText(tree)).toContain(t('trips.reportTitle'));
    await tap(tree, t('trips.reportSubmit'));

    expect(api.reportPost).toHaveBeenCalledWith('t1', 'spam', undefined);
    expect(allText(tree)).toContain(t('trips.reportSent'));
  });
});
