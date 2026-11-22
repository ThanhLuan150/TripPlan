import {useId} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCalendarOutline} from 'react-icons/io5';
import DatePicker from '@/components/ui/DatePicker';
import FormSection from './FormSection';

// Start and end date of the trip (yyyy-mm-dd), with the number of days. Each
// date opens its own calendar; the days of the trip are tinted in both. The
// calendars only offer valid days (`minStart`, then the start for the end
// date); the form checks the rest (more than 7 days, too late today).
export default function DateRangeField({
  startDate,
  endDate,
  minStart,
  days,
  startError,
  endError,
  onStart,
  onEnd,
  onBlur,
}: {
  startDate: string;
  endDate: string;
  minStart: string;
  days: number;
  startError?: string;
  endError?: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onBlur?: () => void;
}) {
  const {t} = useTranslation();
  const startId = useId();
  const endId = useId();

  return (
    <FormSection
      icon={<IoCalendarOutline size={18} />}
      title={t('trips.create.dates')}
      hint={t('trips.create.daysHint', {count: days})}
      error={startError ?? endError}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span id={startId} className="mb-1 block text-xs font-medium text-slate-500">
            {t('trips.create.startDate')}
          </span>
          <DatePicker
            name="startDate"
            labelledBy={startId}
            value={startDate}
            min={minStart}
            rangeStart={startDate}
            rangeEnd={endDate}
            invalid={!!startError}
            onChange={onStart}
            onBlur={onBlur}
          />
        </div>
        <div>
          <span id={endId} className="mb-1 block text-xs font-medium text-slate-500">
            {t('trips.create.endDate')}
          </span>
          <DatePicker
            name="endDate"
            labelledBy={endId}
            value={endDate}
            min={startDate}
            rangeStart={startDate}
            rangeEnd={endDate}
            invalid={!!endError}
            align="right"
            onChange={onEnd}
            onBlur={onBlur}
          />
        </div>
      </div>
    </FormSection>
  );
}
