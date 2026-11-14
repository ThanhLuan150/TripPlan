import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

// Numbers, money and dates in the current language (vi: 1.284 · 12 thg 11, 2026;
// en: 1,284 · Nov 12, 2026).
export const useAdminFormat = () => {
  const {i18n} = useTranslation();
  const locale = i18n.language;

  return useMemo(() => {
    const number = new Intl.NumberFormat(locale);
    const compact = new Intl.NumberFormat(locale, {notation: 'compact', maximumFractionDigits: 1});
    const percent = new Intl.NumberFormat(locale, {style: 'percent', maximumFractionDigits: 1});
    const currency = new Intl.NumberFormat(locale, {style: 'currency', currency: 'VND', maximumFractionDigits: 0});
    const date = new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'short', year: 'numeric'});
    const dateTime = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const day = new Intl.DateTimeFormat(locale, {day: '2-digit', month: '2-digit'});
    const month = new Intl.DateTimeFormat(locale, {month: 'short'});
    // Vietnamese short month names are "Tháng 11": too wide for a chart axis
    const vietnamese = locale.startsWith('vi');
    const relative = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});

    return {
      number: (n: number) => number.format(n),
      compact: (n: number) => compact.format(n),
      percent: (ratio: number) => percent.format(ratio),
      currency: (n: number) => currency.format(n),
      date: (iso: string) => date.format(new Date(iso)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      day: (iso: string) => day.format(new Date(iso)),
      // T11 / Nov
      month: (iso: string) => (vietnamese ? `T${new Date(iso).getMonth() + 1}` : month.format(new Date(iso))),
      // "5 phút trước" / "5 minutes ago"
      relative: (iso: string) => {
        const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
        const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[2];
        return relative.format(Math.round(seconds / size), unit);
      },
      // 0:45
      duration: (totalSeconds: number) =>
        `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`,
    };
  }, [locale]);
};

export type AdminFormat = ReturnType<typeof useAdminFormat>;
