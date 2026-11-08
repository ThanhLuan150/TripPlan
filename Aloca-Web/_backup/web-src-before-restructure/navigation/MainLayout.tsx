import {Link, NavLink, Outlet} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {
  IoHome,
  IoHomeOutline,
  IoPerson,
  IoPersonOutline,
  IoPodium,
  IoPodiumOutline,
} from 'react-icons/io5';
import {AiFillAliwangwang, AiOutlineAliwangwang} from 'react-icons/ai';
import {IconType} from 'react-icons';
import {routes} from './routes';
import {getUser} from '../Helper/storage';
import logo from '../assets/images/Icon.png';

// Bottom tab navigator on phones ("Homestack" on mobile); a top navigation bar
// on tablets / desktop.
const TabArr: {
  route: string;
  label: string;
  activeIcon: IconType;
  unActiveIcon: IconType;
}[] = [
  {
    route: routes.Home,
    label: 'Trang chủ',
    activeIcon: IoHome,
    unActiveIcon: IoHomeOutline,
  },
  {
    route: routes.Assistant,
    label: 'Trợ lý',
    activeIcon: AiFillAliwangwang,
    unActiveIcon: AiOutlineAliwangwang,
  },
  {
    route: routes.Ranking,
    label: 'Xếp hạng',
    activeIcon: IoPodium,
    unActiveIcon: IoPodiumOutline,
  },
  {
    route: routes.Profile,
    label: 'Tài khoản',
    activeIcon: IoPerson,
    unActiveIcon: IoPersonOutline,
  },
];

export default function MainLayout() {
  const {data: user} = useQuery({
    queryKey: ['profile'],
    queryFn: async () => getUser(),
  });
  const avatar = user?.data.image;
  const name = user?.data.fullname || user?.data.username || '';

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* top bar: tablets / desktop */}
      <header className="sticky top-0 z-40 hidden border-b border-slate-200/70 bg-white/80 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link to={routes.Home} className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-9 rounded-xl" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Aloca
            </span>
          </Link>
          <nav
            aria-label="Điều hướng chính"
            className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
            {TabArr.map(item => (
              <NavLink
                key={item.route}
                to={item.route}
                className={({isActive}) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }>
                {({isActive}) => {
                  const Icon = isActive ? item.activeIcon : item.unActiveIcon;
                  return (
                    <>
                      <Icon size={18} aria-hidden />
                      {item.label}
                    </>
                  );
                }}
              </NavLink>
            ))}
          </nav>
          <Link
            to={routes.Profile}
            className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 transition hover:bg-slate-100"
            title="Tài khoản">
            <span className="max-w-36 truncate text-sm font-medium text-slate-700">
              {name}
            </span>
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="size-9 rounded-full object-cover ring-2 ring-brand-100"
              />
            ) : (
              <span className="grid size-9 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {name.charAt(0).toUpperCase() || 'A'}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* bottom tab bar: phones */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="grid h-16 grid-cols-4">
          {TabArr.map(item => (
            <NavLink
              key={item.route}
              to={item.route}
              className={({isActive}) =>
                `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }>
              {({isActive}) => {
                const Icon = isActive ? item.activeIcon : item.unActiveIcon;
                return (
                  <>
                    <span
                      className={`grid h-8 w-14 place-items-center rounded-full transition ${
                        isActive ? 'bg-brand-100' : ''
                      }`}>
                      <Icon size={22} aria-hidden />
                    </span>
                    {item.label}
                  </>
                );
              }}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
