import {ClipboardEvent, KeyboardEvent, useRef} from 'react';
import {useTranslation} from 'react-i18next';

// Six one-digit boxes that move focus forward on input and back on Backspace
// (same behaviour as the six TextInputs + refs on mobile), plus paste support.
export default function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (otp: string[]) => void;
}) {
  const {t} = useTranslation();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
  };

  const handleChange = (index: number, text: string) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < value.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      setDigit(index - 1, '');
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < value.length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) {
      return;
    }
    e.preventDefault();
    const next = value.map((_, i) => digits[i] ?? '');
    onChange(next);
    refs.current[Math.min(digits.length, value.length) - 1]?.focus();
  };

  return (
    <div className="flex justify-between gap-2">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={el => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={t('auth.verify.digit', {n: index + 1})}
          value={digit}
          autoFocus={index === 0}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center text-xl font-semibold text-slate-900 transition outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 ${
            digit ? 'border-brand-300' : 'border-slate-200'
          }`}
        />
      ))}
    </div>
  );
}
