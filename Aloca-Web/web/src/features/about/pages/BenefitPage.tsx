import {useTranslation} from 'react-i18next';
import {IoCalendarOutline, IoCompassOutline, IoOptionsOutline} from 'react-icons/io5';
import Page from '@/components/layout/Page';

const benefits = [
  {icon: IoCalendarOutline, title: 'about.benefit1Title', text: 'about.benefit1Text'},
  {icon: IoOptionsOutline, title: 'about.benefit2Title', text: 'about.benefit2Text'},
  {icon: IoCompassOutline, title: 'about.benefit3Title', text: 'about.benefit3Text'},
];

export default function BenefitPage() {
  const {t} = useTranslation();
  return (
    <Page title={t('about.benefitTitle')}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t('about.benefitHeading')}</h1>
        <p className="mt-1 text-slate-500">{t('about.benefitSubtitle')}</p>
      </div>
      <div className="space-y-3">
        {benefits.map(({icon: Icon, title, text}) => (
          <section key={title} className="card flex gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon size={24} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{t(title)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(text)}</p>
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
