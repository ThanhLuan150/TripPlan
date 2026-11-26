import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import CreateTripPage from '@/features/trips/pages/CreateTripPage';
import {storage, StorageKeys} from '@/lib/storage';
import {currentPath, currentState, renderWithProviders, t} from '../../../utils/render';

// Monday 2 March 2026, 9:00 (only Date is faked: user-event keeps real timers)
const NOW = new Date(2026, 2, 2, 9, 0, 0);

beforeEach(() => {
  window.localStorage.clear();
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
// the calendar of a date field: open it, then click a day (yyyy-mm-dd)
const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const pickDate = (field: HTMLElement, iso: string) => {
  fireEvent.click(field);
  fireEvent.click(day(iso));
};
const quantity = () => screen.getByRole('textbox', {name: new RegExp(t('trips.create.people').replace('?', '\\?'))});
const submit = () => fireEvent.click(screen.getByRole('button', {name: t('trips.create.submit')}));
const options = () => within(screen.getByRole('listbox')).getAllByRole('button').map(b => b.textContent);

const pickProvince = async (text: string, option: string) => {
  const user = userEvent.setup();
  await user.type(province(), text);
  await user.click(within(screen.getByRole('listbox')).getByRole('button', {name: option}));
};

describe('draft', () => {
  const draftKey = 'draft:createTrip:anonymous';
  const saved = () => JSON.parse(window.localStorage.getItem(draftKey) ?? 'null');

  it('does not save an empty form', async () => {
    render();
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(saved()).toBeNull();
  });

  it('saves what the user types, offers it after a reload and puts it back with Continue', async () => {
    const first = render();
    await pickProvince('lam', 'Lâm Đồng');
    await waitFor(() => expect(saved()?.value.location).toBe('Lâm Đồng'));
    first.unmount();

    render();
    expect(screen.getByText(t('drafts.found'))).toBeInTheDocument();
    // nothing is overwritten while the offer is open
    expect(province()).toHaveValue('');
    await userEvent.click(screen.getByRole('button', {name: t('drafts.continue')}));

    expect(province()).toHaveValue('Lâm Đồng');
    expect(screen.queryByText(t('drafts.found'))).toBeNull();
  });

  it('moves the dates of an old draft to today and keeps its length', async () => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({savedAt: Date.now(), value: {location: 'Lâm Đồng', startDate: '2026-02-10', endDate: '2026-02-12', quantity: 1, budgetTier: '', interests: [], note: ''}}),
    );
    render();
    await userEvent.click(screen.getByRole('button', {name: t('drafts.continue')}));

    expect(startInput()).toHaveTextContent('02/03/2026');
    expect(endInput()).toHaveTextContent('04/03/2026');
  });

  it('Start new throws the draft away', async () => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({savedAt: Date.now(), value: {location: 'Lâm Đồng', startDate: '2026-03-02', endDate: '2026-03-02', quantity: 1, budgetTier: '', interests: [], note: ''}}),
    );
    render();
    await userEvent.click(screen.getByRole('button', {name: t('drafts.startNew')}));

    expect(province()).toHaveValue('');
    expect(screen.queryByText(t('drafts.found'))).toBeNull();
    expect(saved()).toBeNull();
  });

  it('does not offer a draft when the form is opened from a suggestion, and says where it came from', () => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({savedAt: Date.now(), value: {location: 'Huế', startDate: '2026-03-02', endDate: '2026-03-02', quantity: 1, budgetTier: '', interests: [], note: ''}}),
    );
    render({location: 'Lâm Đồng', note: 'Thác Datanla (Lâm Đồng): Thác nước', fromSuggestion: true});

    expect(screen.queryByText(t('drafts.found'))).toBeNull();
    expect(screen.getByText(t('trips.create.fromSuggestion'))).toBeInTheDocument();
    expect(province()).toHaveValue('Lâm Đồng');
  });

  it('links to the AI destination ideas', async () => {
    render();
    await userEvent.click(screen.getByRole('button', {name: t('trips.create.askAi')}));
    expect(await currentPath()).toBe('/assistant/recommend');
  });
});

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
    expect(startInput()).toHaveTextContent('02/03/2026');
    expect(endInput()).toHaveTextContent('04/03/2026');
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
  it('shows the dates as dd/mm/yyyy in a button, not the browser date input', () => {
    render();

    expect(startInput().tagName).toBe('BUTTON');
    expect(startInput()).toHaveTextContent('02/03/2026');
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  it('opens a calendar of the month, today marked, and closes it with Escape', () => {
    render();

    fireEvent.click(startInput());

    expect(screen.getByRole('dialog', {name: /2026/})).toBeInTheDocument();
    expect(day('2026-03-02')).toHaveAttribute('aria-pressed', 'true');
    expect(day('2026-03-02')).toHaveAttribute('aria-current', 'date');
    expect(document.querySelectorAll('[data-date]')).toHaveLength(31);
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the calendar when the user clicks elsewhere', () => {
    render();
    fireEvent.click(startInput());

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('goes to the next and previous month', () => {
    render();
    fireEvent.click(startInput());
    const previous = screen.getByRole('button', {name: t('common.previousMonth')});
    expect(previous).toBeDisabled();

    fireEvent.click(screen.getByRole('button', {name: t('common.nextMonth')}));

    expect(document.querySelectorAll('[data-date]')).toHaveLength(30);
    expect(day('2026-04-15')).toBeInTheDocument();
    expect(previous).toBeEnabled();
    fireEvent.click(previous);
    expect(day('2026-03-31')).toBeInTheDocument();
  });

  it('picks a date in another month', () => {
    render();
    fireEvent.click(startInput());
    fireEvent.click(screen.getByRole('button', {name: t('common.nextMonth')}));
    fireEvent.click(day('2026-04-15'));

    expect(startInput()).toHaveTextContent('15/04/2026');
    expect(endInput()).toHaveTextContent('15/04/2026');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not offer days in the past', () => {
    render();
    fireEvent.click(startInput());

    expect(day('2026-03-01')).toBeDisabled();
    expect(day('2026-03-02')).toBeEnabled();
    fireEvent.click(day('2026-03-01'));
    expect(startInput()).toHaveTextContent('02/03/2026');
  });

  it('refuses today after 18:00', async () => {
    vi.setSystemTime(new Date(2026, 2, 2, 19, 30));
    render();

    // (go to tomorrow, then back to today)
    pickDate(startInput(), '2026-03-03');
    pickDate(startInput(), '2026-03-02');

    expect(await screen.findByText(t('trips.create.errorTooLate'))).toBeInTheDocument();
    expect(startInput()).toHaveAttribute('data-invalid', 'true');
  });

  it('moves the end date with a later start date', () => {
    render();

    pickDate(startInput(), '2026-03-10');

    expect(startInput()).toHaveTextContent('10/03/2026');
    expect(endInput()).toHaveTextContent('10/03/2026');
    fireEvent.click(endInput());
    expect(day('2026-03-09')).toBeDisabled();
    expect(day('2026-03-10')).toBeEnabled();
  });

  it('keeps a later end date when the start moves', () => {
    render();
    pickDate(endInput(), '2026-03-06');

    pickDate(startInput(), '2026-03-04');

    expect(endInput()).toHaveTextContent('06/03/2026');
    expect(screen.getByText(t('trips.create.daysHint', {count: 3}))).toBeInTheDocument();
  });

  it('does not offer an end date before the start', () => {
    render();
    pickDate(startInput(), '2026-03-05');

    fireEvent.click(endInput());
    fireEvent.click(day('2026-03-03'));

    expect(day('2026-03-03')).toBeDisabled();
    expect(endInput()).toHaveTextContent('05/03/2026');
  });

  it('tints the days of the trip', () => {
    render({days: 4});
    fireEvent.click(endInput());

    expect(day('2026-03-03')).toHaveClass('bg-brand-50');
    expect(day('2026-03-04')).toHaveClass('bg-brand-50');
    expect(day('2026-03-05')).not.toHaveClass('bg-brand-50');
    expect(day('2026-03-05')).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the end date when the trip is too long', async () => {
    render();

    pickDate(endInput(), '2026-03-12');

    expect(await screen.findByText(t('trips.create.errorMaxDays'))).toBeInTheDocument();
    expect(endInput()).toHaveAttribute('data-invalid', 'true');
    expect(startInput()).toHaveAttribute('data-invalid', 'false');
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

describe('custom fields', () => {
  it('marks the invalid fields for assistive technology', async () => {
    render();

    submit();

    await screen.findByText(t('trips.create.errorProvince'));
    expect(province()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
    expect(province()).toHaveAttribute('aria-describedby', 'province-error');
  });

  it('clears a typed destination with the clear button', async () => {
    const user = userEvent.setup();
    render();
    await user.type(province(), 'Sài');

    await user.click(screen.getByRole('button', {name: t('common.clear')}));

    expect(province()).toHaveValue('');
  });

  it('counts the characters of the note', async () => {
    const user = userEvent.setup();
    render();
    expect(screen.getByText('0/1500')).toBeInTheDocument();

    await user.type(screen.getByLabelText(new RegExp(t('trips.create.note'))), 'abcde');

    expect(screen.getByText('5/1500')).toBeInTheDocument();
  });

  it('shows the number of people again after a reset', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', {name: t('trips.create.increase')}));
    expect(quantity()).toHaveValue('2');

    await user.click(screen.getByRole('button', {name: t('trips.create.reset')}));

    expect(quantity()).toHaveValue('1');
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

  it('blocks the submit while a date is invalid', async () => {
    vi.setSystemTime(new Date(2026, 2, 2, 19, 30));
    render({location: 'Lâm Đồng'});
    fireEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));
    pickDate(startInput(), '2026-03-03');
    pickDate(startInput(), '2026-03-02');

    submit();

    expect(await screen.findByText(t('trips.create.errorTooLate'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.create.title'))).toBeInTheDocument();
  });

  it('shows no error before the user types or submits', () => {
    render({location: 'Lâm Đồng'});

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a valid date clears the error', async () => {
    vi.setSystemTime(new Date(2026, 2, 2, 19, 30));
    render();
    pickDate(startInput(), '2026-03-03');
    pickDate(startInput(), '2026-03-02');
    expect(await screen.findByText(t('trips.create.errorTooLate'))).toBeInTheDocument();

    pickDate(startInput(), '2026-03-04');

    await waitFor(() => expect(screen.queryByText(t('trips.create.errorTooLate'))).toBeNull());
  });

  it('needs at least one kind of place, and the error goes away when one is chosen', async () => {
    render({location: 'Lâm Đồng'});
    fireEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));

    submit();

    expect(await screen.findByText(t('trips.create.errorInterests'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.create.areaHistory')})).toHaveClass('border-rose-300');

    fireEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));

    await waitFor(() => expect(screen.queryByText(t('trips.create.errorInterests'))).toBeNull());
  });

  it('shows the error of the province and of the budget together', async () => {
    render();

    submit();

    expect(await screen.findByText(t('trips.create.errorProvince'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.create.errorMissing'))).toBeInTheDocument();
  });

  it('reset clears the form and its errors', async () => {
    const user = userEvent.setup();
    render({location: 'Lâm Đồng'});
    submit();
    expect(await screen.findByText(t('trips.create.errorMissing'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: t('trips.create.reset')}));

    expect(province()).toHaveValue('');
    await waitFor(() => expect(screen.queryByText(t('trips.create.errorMissing'))).toBeNull());
  });

  it('limits a trip to 7 days', async () => {
    render({location: 'Lâm Đồng'});
    fireEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}));
    pickDate(endInput(), '2026-03-10');

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
    fireEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));

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
    expect(endInput()).toHaveTextContent('02/03/2026');
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
