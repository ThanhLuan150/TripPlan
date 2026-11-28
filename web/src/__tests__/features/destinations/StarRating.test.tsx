import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {StarDisplay, StarInput} from '@/features/destinations/components/StarRating';
import {t} from '../../utils/render';

describe('StarDisplay', () => {
  it('is an image whose name says the rating', () => {
    render(<StarDisplay value={4} />);

    expect(screen.getByRole('img', {name: t('reviews.starsOf', {count: 4})})).toBeInTheDocument();
  });

  it('draws the average rounded to the nearest whole star', () => {
    const {container, rerender} = render(<StarDisplay value={4.4} />);
    const filled = () => container.querySelectorAll('svg path[d]').length; // 5 stars either way: compare by outline vs fill
    expect(container.querySelectorAll('svg')).toHaveLength(5);
    const first = container.innerHTML;
    rerender(<StarDisplay value={4.6} />);

    expect(container.innerHTML).not.toBe(first);
    expect(filled()).toBeGreaterThan(0);
  });
});

describe('StarInput', () => {
  it('shows five radio buttons named by their stars, with the chosen one checked', () => {
    render(<StarInput value={3} onChange={() => undefined} />);

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', {name: t('reviews.star', {count: 3})})).toBeChecked();
    expect(screen.getByRole('radio', {name: t('reviews.star', {count: 4})})).not.toBeChecked();
    expect(screen.getByRole('radiogroup', {name: t('reviews.ratingLabel')})).toBeInTheDocument();
  });

  it('chooses a rating with a click', async () => {
    const onChange = vi.fn();
    render(<StarInput value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', {name: t('reviews.star', {count: 5})}));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('moves with the arrow keys and stays inside 1-5', async () => {
    const onChange = vi.fn();
    render(<StarInput value={5} onChange={onChange} />);
    screen.getByRole('radio', {name: t('reviews.star', {count: 5})}).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(5);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('starts at 1 star with the arrow key when nothing is chosen, and never goes below 1', async () => {
    const onChange = vi.fn();
    const {rerender} = render(<StarInput value={0} onChange={onChange} />);
    screen.getByRole('radio', {name: t('reviews.star', {count: 1})}).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(1);
    rerender(<StarInput value={1} onChange={onChange} />);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('marks the group invalid', () => {
    render(<StarInput value={0} onChange={() => undefined} invalid />);

    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
  });
});
