import {useId, useRef, useState, type KeyboardEvent} from 'react';
import {useTranslation} from 'react-i18next';
import type {AdminUserDetail} from '../types';
import {ActivityPanel, ChallengesPanel, OverviewPanel, TripsPanel} from './UserTabPanels';

const TABS = ['overview', 'trips', 'challenges', 'activity'] as const;
type Tab = (typeof TABS)[number];

// Overview / Trip plans / Challenges / Activity history (WAI-ARIA tabs: arrow
// keys move between the tabs).
export default function UserDetailTabs({detail}: {detail: AdminUserDetail}) {
  const {t} = useTranslation();
  const id = useId();
  const [active, setActive] = useState<Tab>('overview');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) {
      return;
    }
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label={t('admin.users.tabs.label')} className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab, index) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={el => {
                refs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-${tab}`}
              aria-selected={selected}
              aria-controls={`${id}-${tab}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab)}
              onKeyDown={e => onKeyDown(e, index)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                selected ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}>
              {t(`admin.users.tabs.${tab}`)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-${active}-panel`} aria-labelledby={`${id}-${active}`} tabIndex={0} className="outline-none">
        {active === 'overview' && <OverviewPanel detail={detail} />}
        {active === 'trips' && <TripsPanel trips={detail.trips} />}
        {active === 'challenges' && <ChallengesPanel challenges={detail.challenges} />}
        {active === 'activity' && <ActivityPanel detail={detail} />}
      </div>
    </div>
  );
}
