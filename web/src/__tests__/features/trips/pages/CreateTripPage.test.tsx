import {fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import CreateTripPage from '@/features/trips/pages/CreateTripPage';
import {storage, StorageKeys} from '@/lib/storage';
import {currentPath, currentState, renderWithProviders, t} from '../../../utils/render';

// Monday 2 March 2026, 9:00 (only Date is faked: user-event keeps real timers)
const NOW = new Date(2026, 2, 2, 9, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const render = (state?: unknown) =>
  renderWithProviders(<CreateTripPage />, {route: '/assistant/trips/new', state});

const province = () => screen.getByLabelText(t('trips.create.destination'));
const startInput = () => screen.getByLabelText(t('trips.create.startDate'));
const endInput = () => screen.getByLabelText(t('trips.create.endDate'));
const quantity = () => screen.getByRole('textbox', {name: new RegExp(t('trips.create.people').replace('?', '\\?'))});
const submit = () => fireEvent.click(screen.getByRole('button', {name: t('trips.create.submit')}));
const options = () => within(screen.getByRole('listbox')).getAllByRole('button').map(b => b.textContent);

const pickProvince = async (text: string, option: string) => {
  const user = userEvent.setup();
  await user.type(province(), text);
  await user.click(within(screen.getByRole('listbox')).getByRole('button', {name: option}));
};

describe('destination', () => {
  it('suggests provinces, with or without accents', async () => {
    const user = userEvent.setup();
    render();

    await user.type(province(), 'lam');
    expect(options()).toContain('Lâm Đồng');

    await user.clear(province());
    await user.type(province(), 'Đồng');
    expect(options()).toEqual(expect.arrayContaining(['Lâm Đồng', 'Đồng Nai', 'Đồng Tháp']));
  });

  it('picks a province from the list', async () => {
    render();

    await pickProvince('lam', 'Lâm Đồng');

    expect(province()).toHaveValue('Lâm Đồng');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Enter picks the first suggestion, Escape closes the list', async () => {
    const user = userEvent.setup();
    render();

    await user.type(province(), 'ha giang{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.type(province(), '{Enter}');
    expect(province()).toHaveValue('Hà Giang');
  });

  it('the arrow button toggles the whole list and clears the field', async () => {
    const user = userEvent.setup();
    render({location: 'Lâm Đồng'});
    const arrow = screen.getByRole('button', {name: t('trips.create.provinceList')});

    await user.click(arrow);
    expect(province()).toHaveValue('');
    expect(options()).toHaveLength(63);

    await user.click(arrow);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes the list on a click outside', async () => {
    const user = userEvent.setup();
    render();

    await user.click(province());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('marks the selected province in the list', async () => {
    const user = userEvent.setup();
    render({location: 'Lâm Đồng'});

    await user.click(province());

    expect(within(screen.getByRole('listbox')).getByRole('button', {name: 'Lâm Đồng'})).toHaveClass('font-semibold');
  });
});

describe('prefill (home search, AI chat)', () => {
  it('fills destination, days, people and note', () => {
    render({location: 'Lâm Đồng', days: 3, people: 4, note: 'Đồi chè Cầu Đất', fromChat: true});

    expect(province()).toHaveValue('Lâm Đồng');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(startInput()).toHaveValue('2026-03-02');
    expect(endInput()).toHaveValue('2026-03-04');
    expect(screen.getByText(t('trips.create.daysHint', {count: 3}))).toBeInTheDocument();
    expect(quantity()).toHaveValue('4');
    expect(screen.getByLabelText(new RegExp(t('trips.create.note')))).toHaveValue('Đồi chè Cầu Đất');
    expect(screen.getByText(t('trips.create.fromChat'))).toBeInTheDocument();
  });

  it('asks for the province when the chat did not name one', () => {
    render({fromChat: true});

    expect(screen.getByText(`${t('trips.create.fromChat')} ${t('trips.create.fromChatNoPlace')}`)).toBeInTheDocument();
  });

  it('opens the suggestions for a destination that is not a province', () => {
    render({location: 'Giang'});

    expect(options()).toEqual(expect.arrayContaining(['An Giang', 'Hà Giang', 'Kiên Giang']));
  });
});

describe('dates', () => {
  it('refuses a start date in the past', async () => {
    render();

    fireEvent.change(startInput(), {target: {value: '2026-03-01'}});

    expect(await screen.findByText(t('trips.create.errorPastDate'))).toBeInTheDocument();
    expect(startInput()).toHaveValue('2026-03-02');
  });

  it('refuses today after 18:00', async () => {
    vi.setSystemTime(new Date(2026, 2, 2, 19, 30));
    render();

    // (React only reports a change of value: go to tomorrow, then back to today)
    fireEvent.change(startInput(), {target: {value: '2026-03-03'}});
    fireEvent.change(startInput(), {target: {value: '2026-03-02'}});

    expect(await screen.findByText(t('trips.create.errorTooLate'))).toBeInTheDocument();
  });

  it('moves the end date with a later start date', () => {
    render();

    fireEvent.change(startInput(), {target: {value: '2026-03-10'}});

    expect(startInput()).toHaveValue('2026-03-10');
    expect(endInput()).toHaveValue('2026-03-10');
    expect(endInput()).toHaveAttribute('min', '2026-03-10');
  });

  it('keeps a later end date when the start moves', () => {
    render();
    fireEvent.change(endInput(), {target: {value: '2026-03-06'}});

    fireEvent.change(startInput(), {target: {value: '2026-03-04'}});

    expect(endInput()).toHaveValue('2026-03-06');
    expect(screen.getByText(t('trips.create.daysHint', {count: 3}))).toBeInTheDocument();
  });

  it('refuses an end date before the start', async () => {
    render();
    fireEvent.change(startInput(), {target: {value: '2026-03-05'}});

    fireEvent.change(endInput(), {target: {value: '2026-03-03'}});

    expect(await screen.findByText(t('trips.create.errorEndBeforeStart'))).toBeInTheDocument();
    expect(endInput()).toHaveValue('2026-03-05');
  });

  it('ignores a cleared date field', () => {
    render();

    fireEvent.change(startInput(), {target: {value: ''}});
    fireEvent.change(endInput(), {target: {value: ''}});

    expect(startInput()).toHaveValue('2026-03-02');
    expect(endInput()).toHaveValue('2026-03-02');
  });
});

describe('people and budget', () => {
  it('+ / - stay between 1 and 10', async () => {
    const user = userEvent.setup();
    render();
    const minus = screen.getByRole('button', {name: t('trips.create.decrease')});
    const plus = screen.getByRole('button', {name: t('trips.create.increase')});

    expect(minus).toBeDisabled();
    await user.click(plus);
    expect(quantity()).toHaveValue('2');
    await user.click(minus);
    expect(quantity()).toHaveValue('1');

    for (let i = 0; i < 12; i += 1) {
      fireEvent.click(plus);
    }
    expect(quantity()).toHaveValue('10');
    expect(plus).toBeDisabled();
  });

  it('typed numbers are clamped when leaving the field', async () => {
    const user = userEvent.setup();
    render();

    await user.clear(quantity());
    await user.type(quantity(), '15');
    expect(quantity()).toHaveValue('15');
    await user.tab();
    expect(quantity()).toHaveValue('10');

    await user.clear(quantity());
    await user.type(quantity(), 'abc');
    await user.tab();
    expect(quantity()).toHaveValue('10');
  });

  it('budget ranges are per group size', async () => {
    const user = userEvent.setup();
    render();

    expect(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))})).toHaveTextContent(
      t('trips.create.budgetUnder', {max: '1.000.000'}),
    );
    await user.click(screen.getByRole('button', {name: t('trips.create.increase')}));

    expect(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))})).toHaveTextContent(
      t('trips.create.budgetRange', {min: '2.000.000', max: '10.000.000'}),
    );
    const high = screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetHigh'))});
    await user.click(high);
    expect(high).toHaveAttribute('aria-checked', 'true');
  });

  it('interests toggle on and off', async () => {
    const user = userEvent.setup();
    render();
    const history = screen.getByRole('button', {name: t('trips.create.areaHistory')});

    await user.click(history);
    expect(history).toHaveAttribute('aria-pressed', 'true');
    await user.click(history);
    expect(history).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('submit', () => {
  it('needs a province from the list', async () => {
    const user = userEvent.setup();
    render();

    await user.type(province(), 'Sài Gòn');
    submit();

    expect(await screen.findByText(t('trips.create.errorProvince'))).toBeInTheDocument();
  });

  it('needs a budget', async () => {
    render();
    await pickProvince('thua', 'Thừa Thiên Huế');

    submit();

    expect(await screen.findByText(t('trips.create.errorMissing'))).toBeInTheDocument();
  });

  it('limits a trip to 7 days', async () => {
    render({location: 'Lâm Đồng'});
    fireEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));
    fireEvent.change(endInput(), {target: {value: '2026-03-10'}});

    submit();

    expect(await screen.findByText(t('trips.create.errorMaxDays'))).toBeInTheDocument();
  });

  it('opens the AI suggestions with the form values', async () => {
    storage.setItem(StorageKeys.userLocation, 'Quận 1');
    const user = userEvent.setup();
    render({location: 'Lâm Đồng', days: 2, people: 2});
    await user.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))}));
    await user.click(screen.getByRole('button', {name: t('trips.create.areaOutdoor')}));
    await user.type(screen.getByLabelText(new RegExp(t('trips.create.note'))), '  ăn lẩu gà lá é  ');

    submit();

    expect(await currentPath()).toBe('/assistant/trips/generate');
    const state = await currentState();
    expect(state).toEqual({
      location: 'Lâm Đồng',
      quantity: 2,
      budget: '2.000.000 VND - 10.000.000 VND',
      budgetTier: 'mid',
      areaTypes: ['Hoạt động ngoài trời'],
      userLocation: 'Quận 1',
      days: 2,
      startDate: expect.any(String),
      endDate: expect.any(String),
      note: 'ăn lẩu gà lá é',
    });
    expect(new Date(state.startDate).getDate()).toBe(2);
    expect(new Date(state.endDate).getDate()).toBe(3);
  });

  it('sends no note when it is blank', async () => {
    render({location: 'Lâm Đồng'});
    fireEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));

    submit();

    expect((await currentState()).note).toBeUndefined();
  });

  it('reset clears the form', async () => {
    const user = userEvent.setup();
    render({location: 'Lâm Đồng', people: 3, note: 'x', days: 3});
    await user.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));

    await user.click(screen.getByRole('button', {name: t('trips.create.reset')}));

    expect(province()).toHaveValue('');
    expect(quantity()).toHaveValue('1');
    expect(endInput()).toHaveValue('2026-03-02');
    expect(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))})).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText(new RegExp(t('trips.create.note')))).toHaveValue('');
  });

  it('the back button returns to the list', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', {name: t('common.back')}));

    expect(await currentPath()).toBe('/assistant/trips');
  });
});
