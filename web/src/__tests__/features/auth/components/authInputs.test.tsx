import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import i18n from '@/lib/i18n';
import OtpInput from '@/features/auth/components/OtpInput';
import PasswordInput from '@/features/auth/components/PasswordInput';

describe('PasswordInput', () => {
  it('hides the password until the eye button is pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Mật khẩu" defaultValue="secret" />);
    const input = screen.getByPlaceholderText('Mật khẩu');

    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', {name: i18n.t('auth.showPassword')}));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', {name: i18n.t('auth.hidePassword')}));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('passes other props to the input', () => {
    const onChange = vi.fn();
    render(<PasswordInput name="password" aria-label="pw" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('pw'), {target: {value: 'x'}});

    expect(screen.getByLabelText('pw')).toHaveAttribute('name', 'password');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('OtpInput', () => {
  // Controlled wrapper, like the verify pages
  function Otp({onValue}: {onValue?: (otp: string[]) => void}) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    return (
      <OtpInput
        value={otp}
        onChange={next => {
          setOtp(next);
          onValue?.(next);
        }}
      />
    );
  }
  const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

  it('renders one labelled box per digit, focusing the first', () => {
    render(<Otp />);

    expect(boxes()).toHaveLength(6);
    expect(boxes()[0]).toHaveFocus();
    expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByLabelText(i18n.t('auth.verify.digit', {n: 3}))).toBe(boxes()[2]);
  });

  it('keeps digits only and moves to the next box', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Otp onValue={onValue} />);

    await user.keyboard('1a2');

    expect(boxes().map(b => b.value)).toEqual(['1', '2', '', '', '', '']);
    expect(boxes()[2]).toHaveFocus();
    expect(onValue).toHaveBeenLastCalledWith(['1', '2', '', '', '', '']);
  });

  it('Backspace on an empty box clears the previous one', async () => {
    const user = userEvent.setup();
    render(<Otp />);

    await user.keyboard('12');
    await user.keyboard('{Backspace}');

    expect(boxes().map(b => b.value)).toEqual(['1', '', '', '', '', '']);
    expect(boxes()[1]).toHaveFocus();
  });

  it('arrow keys move between boxes', async () => {
    const user = userEvent.setup();
    render(<Otp />);

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(boxes()[2]).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(boxes()[1]).toHaveFocus();
  });

  it('pasting a code fills every box', async () => {
    const user = userEvent.setup();
    render(<Otp />);

    await user.paste('Mã: 482 913');

    expect(boxes().map(b => b.value)).toEqual(['4', '8', '2', '9', '1', '3']);
    expect(boxes()[5]).toHaveFocus();
  });

  it('ignores a paste without digits', async () => {
    const user = userEvent.setup();
    render(<Otp />);

    await user.paste('abc');

    expect(boxes().map(b => b.value)).toEqual(['', '', '', '', '', '']);
    expect(boxes()[0]).toHaveFocus();
  });
});
