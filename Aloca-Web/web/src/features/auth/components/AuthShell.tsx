import {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {routes} from '@/app/routes';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import logo from '@/assets/images/Icon.png';
import cover from '@/assets/images/sliderImage1.jpg';

// Two-column layout for the account screens: photo + tagline on wide screens,
// a single centered form column on phones.
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const {t} = useTranslation();
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 to-slate-50 lg:grid lg:grid-cols-[1.1fr_1fr] lg:bg-none lg:bg-white">
      <aside className="relative hidden overflow-hidden lg:block">
        <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to={routes.LandingPage} className="flex w-fit items-center gap-3">
            <img src={logo} alt="" className="size-11 rounded-xl" />
            <span className="text-2xl font-extrabold tracking-tight">Aloca</span>
          </Link>
          <div>
            <h2 className="text-4xl leading-tight font-bold">
              {t('auth.shell.headlineLine1')}
              <br />
              {t('auth.shell.headlineLine2')}
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              {t('auth.shell.description')}
            </p>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-dvh items-center justify-center px-5 py-14">
        <LanguageSwitcher className="absolute top-4 right-4" />
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              src={logo}
              alt="Aloca"
              className="mb-5 size-16 rounded-2xl shadow-lift lg:hidden"
            />
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
          {footer && (
            <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function AuthLink({to, children}: {to: string; children: ReactNode}) {
  return (
    <Link to={to} className="font-semibold text-brand-600 hover:text-brand-700">
      {children}
    </Link>
  );
}
