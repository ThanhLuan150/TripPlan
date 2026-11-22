import {useTranslation} from 'react-i18next';
import {IoCheckmark, IoHeartOutline} from 'react-icons/io5';
import {areaTypes} from '../../data/areaTypes';
import FormSection from './FormSection';

// Kinds of places the user likes: any number of chips.
export default function InterestsField({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const {t} = useTranslation();
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter(a => a !== item) : [...value, item]);
  return (
    <FormSection icon={<IoHeartOutline size={18} />} title={t('trips.create.interests')} error={error}>
      <div role="group" aria-invalid={!!error} className="flex flex-wrap gap-2">
        {areaTypes.map(({value: item, labelKey}) => {
          const selected = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(item)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                selected
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : `${error ? 'border-rose-300' : 'border-slate-200'} text-slate-700 hover:border-brand-300 hover:bg-brand-50`
              }`}>
              {selected && <IoCheckmark size={15} />}
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}
