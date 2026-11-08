import {useTranslation} from 'react-i18next';
import {IoCalculatorOutline, IoChatbubblesOutline, IoGameControllerOutline} from 'react-icons/io5';
import Page from '@/components/layout/Page';
import cover from '@/assets/images/hagiangImage.jpg';

const highlights = [
  {icon: IoGameControllerOutline, key: 'about.highlightGame'},
  {icon: IoCalculatorOutline, key: 'about.highlightCost'},
  {icon: IoChatbubblesOutline, key: 'about.highlightChat'},
];

export default function WhatAlocaPage() {
  const {t} = useTranslation();
  return (
    <Page title={t('about.whatTitle')}>
      <article className="card overflow-hidden">
        <img src={cover} alt="" className="aspect-[16/7] w-full object-cover" />
        <div className="space-y-5 p-5 md:p-7">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t('about.whatHeading')}</h1>
          <p className="leading-relaxed text-slate-600">{t('about.whatText')}</p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {highlights.map(({icon: Icon, key}) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-800">
                <Icon size={22} className="shrink-0 text-brand-600" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </Page>
  );
}
