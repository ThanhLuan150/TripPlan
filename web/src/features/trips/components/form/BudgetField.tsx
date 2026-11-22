import {useTranslation} from 'react-i18next';
import {IoCheckmark, IoWalletOutline} from 'react-icons/io5';
import type {BudgetTier} from '../../types';
import FormSection from './FormSection';
import {choiceClass} from './styles';

export interface BudgetOption {
  tier: BudgetTier;
  labelKey: string;
  key: string;
  vars: Record<string, string | undefined>;
}

// Budget per group: three cards, one can be chosen.
export default function BudgetField({
  value,
  options,
  onChange,
  error,
}: {
  value: BudgetTier | '';
  options: BudgetOption[];
  onChange: (tier: BudgetTier) => void;
  error?: string;
}) {
  const {t} = useTranslation();
  return (
    <FormSection icon={<IoWalletOutline size={18} />} title={t('trips.create.budget')} error={error}>
      <div role="radiogroup" aria-invalid={!!error} className="grid gap-2 sm:grid-cols-3">
        {options.map(option => {
          const selected = value === option.tier;
          return (
            <button
              key={option.tier}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.tier)}
              className={choiceClass(selected, !!error)}>
              <span className={`flex items-center justify-between text-sm font-semibold ${selected ? 'text-brand-700' : 'text-slate-900'}`}>
                {t(option.labelKey)}
                {selected && <IoCheckmark size={16} />}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{t(option.key, option.vars)}</span>
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}
