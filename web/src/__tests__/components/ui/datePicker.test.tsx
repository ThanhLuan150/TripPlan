import {fireEvent, screen} from '@testing-library/react';
import {useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import DatePicker from '@/components/ui/DatePicker';
import i18n from '@/lib/i18n';
import {renderWithProviders, t} from '../../utils/render';

// Monday 2 March 2026
const NOW = new Date(2026, 2, 2, 9, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('vi');
});

const Harness = ({
  min,
  onBlur,
  align,
  rangeStart,
  rangeEnd,
}: {
  min?: string;
  onBlur?: () => void;
  align?: 'left' | 'right';
  rangeStart?: string;
  rangeEnd?: string;
}) => {
  const [value, setValue] = useState('2026-03-02');
  return (
    <>
      <span id="label">Date</span>
      <DatePicker
        value={value}
        min={min}
        labelledBy="label"
        align={align}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onChange={setValue}
        onBlur={onBlur}
      />
      <p>chosen {value}</p>
    </>
  );
};

const field = () => screen.getByRole('button', {name: 'Date'});
const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;

describe('DatePicker', () => {
  it('shows the date as dd/mm/yyyy and opens a calendar of its month', () => {
    renderWithProviders(<Harness />);

    expect(field()).toHaveTextContent('02/03/2026');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(field());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelectorAll('[data-date]')).toHaveLength(31);
    expect(day('2026-03-02')).toHaveAttribute('aria-pressed', 'true');
  });

  it('closes when the field is clicked again', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(field());

    fireEvent.click(field());

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('picks a day, closes and reports that the field was left', () => {
    const onBlur = vi.fn();
    renderWithProviders(<Harness onBlur={onBlur} />);
    fireEvent.click(field());

    fireEvent.click(day('2026-03-10'));

    expect(screen.getByText('chosen 2026-03-10')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape, and with a click outside, calling onBlur each time', () => {
    const onBlur = vi.fn();
    renderWithProviders(<Harness onBlur={onBlur} />);

    fireEvent.click(field());
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(field());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('ignores a click outside and other keys while it is closed or for other keys', () => {
    const onBlur = vi.fn();
    renderWithProviders(<Harness onBlur={onBlur} />);

    fireEvent.mouseDown(document.body);
    fireEvent.click(field());
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'a'});

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onBlur).not.toHaveBeenCalled();
  });

  it('works without onBlur', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(field());

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cannot pick a day before `min`, nor go to a month before it', () => {
    renderWithProviders(<Harness min="2026-03-02" />);
    fireEvent.click(field());

    expect(day('2026-03-01')).toBeDisabled();
    expect(day('2026-03-02')).toBeEnabled();
    expect(screen.getByRole('button', {name: t('common.previousMonth')})).toBeDisabled();
  });

  it('can go back to earlier months when there is no `min`, and forward again', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(field());
    const previous = screen.getByRole('button', {name: t('common.previousMonth')});
    expect(previous).toBeEnabled();

    fireEvent.click(previous);
    expect(day('2026-02-28')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-date]')).toHaveLength(28);
    fireEvent.click(screen.getByRole('button', {name: t('common.nextMonth')}));
    expect(day('2026-03-31')).toBeInTheDocument();
  });

  it('crosses the end of the year', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(field());

    for (let i = 0; i < 10; i += 1) {
      fireEvent.click(screen.getByRole('button', {name: t('common.nextMonth')}));
    }

    expect(day('2027-01-31')).toBeInTheDocument();
  });

  it('opens again on the month of the date that was picked', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(field());
    fireEvent.click(screen.getByRole('button', {name: t('common.nextMonth')}));
    fireEvent.click(day('2026-04-15'));

    fireEvent.click(field());

    expect(day('2026-04-30')).toBeInTheDocument();
  });

  it('tints the days between the two ends of the range, not the ends', () => {
    renderWithProviders(<Harness rangeStart="2026-03-02" rangeEnd="2026-03-05" />);
    fireEvent.click(field());

    expect(day('2026-03-03')).toHaveClass('bg-brand-50');
    expect(day('2026-03-04')).toHaveClass('bg-brand-50');
    expect(day('2026-03-06')).not.toHaveClass('bg-brand-50');
  });

  it('aligns the calendar to the right of its field when asked', () => {
    renderWithProviders(<Harness align="right" />);
    fireEvent.click(field());

    expect(screen.getByRole('dialog')).toHaveClass('right-0');
  });

  it('follows the language: English month and weekday names', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<Harness />);
    fireEvent.click(field());

    expect(screen.getByRole('dialog')).toHaveAccessibleName('March 2026');
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('marks an invalid field', () => {
    renderWithProviders(
      <DatePicker value="2026-03-02" invalid name="startDate" onChange={() => undefined} />,
    );

    expect(screen.getByRole('button')).toHaveAttribute('data-invalid', 'true');
  });
});
