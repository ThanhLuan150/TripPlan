import {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {routes} from '../../navigation/routes';
import logo from '../../assets/images/Icon.png';
import cover from '../../assets/images/sliderImage1.jpg';

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
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 to-slate-50 lg:grid lg:grid-cols-[1.1fr_1fr] lg:bg-none lg:bg-white">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to={routes.LandingPage} className="flex w-fit items-center gap-3">
            <img src={logo} alt="" className="size-11 rounded-xl" />
            <span className="text-2xl font-extrabold tracking-tight">Aloca</span>
          </Link>
          <div>
            <h2 className="text-4xl leading-tight font-bold">
              Lên kế hoạch du lịch
              <br />
              dễ như chơi game
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              Trò chuyện với trợ lý AI, nhận lịch trình tối ưu và chinh phục
              thử thách ở mỗi điểm đến.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              src={logo}
              alt="Aloca"
              className="mb-5 size-16 rounded-2xl shadow-lift lg:hidden"
            />
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            )}
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

export function Field({
  label,
  htmlFor,
  error,
  children,
  aside,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string | false;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
