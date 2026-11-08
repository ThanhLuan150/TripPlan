import {ReactNode} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';
import {
  AiOutlineCustomerService,
  AiOutlineExport,
  AiOutlineForm,
  AiOutlineUnlock,
} from 'react-icons/ai';
import {
  IoAirplaneOutline,
  IoChevronForward,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoStar,
} from 'react-icons/io5';
import {getUser, storage} from '../Helper/storage';
import {routes} from '../navigation/routes';
import vector from '../assets/images/Vector.png';
import genz from '../assets/images/Genz.png';
import userImg from '../assets/images/user.png';

function Row({
  icon,
  label,
  to,
  href,
}: {
  icon: ReactNode;
  label: string;
  to?: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <IoChevronForward size={16} className="text-slate-400" />
    </>
  );
  const cls =
    'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50';
  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls}>
      {content}
    </button>
  );
}

export default function ProfileScreens() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {data: user} = useQuery({
    queryKey: ['profile'],
    queryFn: async () => getUser(),
  });
  const data = user?.data;
  const name = data?.fullname || data?.username || '';

  const handleLogout = () => {
    storage.clear();
    queryClient.clear();
    navigate(routes.Login, {replace: true});
  };

  return (
    <div className="space-y-5 px-4 py-5 md:px-6 md:py-8">
      {/* header card */}
      <section className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700 md:h-32" />
        <div className="-mt-12 flex flex-col items-center gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:gap-5 md:-mt-14">
          {data?.image ? (
            <img
              src={data.image}
              alt=""
              className="size-24 rounded-full bg-slate-100 object-cover ring-4 ring-white md:size-28"
            />
          ) : (
            <span className="grid size-24 place-items-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700 ring-4 ring-white md:size-28">
              {name.charAt(0).toUpperCase() || 'A'}
            </span>
          )}
          <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
            <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
              {name}
            </h1>
            {data?.email && (
              <p className="truncate text-sm text-slate-500">{data.email}</p>
            )}
            {typeof data?.experience === 'number' && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <IoStar size={12} />
                {data.experience} điểm
              </span>
            )}
          </div>
          <Link to={routes.Editprofile} className="btn btn-outline">
            <AiOutlineForm size={18} />
            Chỉnh sửa
          </Link>
        </div>
      </section>

      {/* quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={routes.Notification}
          className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <IoNotificationsOutline size={22} />
          </span>
          <span className="font-semibold text-slate-800">Thông báo</span>
        </Link>
        <Link
          to={routes.AddNewTrip}
          className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <IoAirplaneOutline size={22} />
          </span>
          <span className="font-semibold text-slate-800">Kế hoạch</span>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* about */}
        <section className="card p-3">
          <h2 className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Về Aloca
          </h2>
          <Row
            icon={<img src={vector} alt="" className="size-5 object-contain" />}
            label="Aloca là gì ?"
            to={routes.WhatAloca}
          />
          <Link
            to={routes.Benefit}
            className="mt-2 flex items-center gap-4 rounded-xl bg-gradient-to-r from-brand-50 to-white p-4 transition hover:from-brand-100">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Aloca for GenZ</p>
              <p className="text-sm text-slate-600">
                bạn cần đặt tua du lịch đúng không ?
              </p>
              <span className="mt-2 inline-flex rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                Lợi ích
              </span>
            </div>
            <img src={genz} alt="" className="size-16 rounded-full" />
          </Link>
        </section>

        {/* support */}
        <section className="card p-3">
          <h2 className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Hỗ trợ
          </h2>
          <Row
            icon={<AiOutlineCustomerService size={18} />}
            label="Hotline 24/6: 19001009"
            href="tel:19001009"
          />
          <Row icon={<AiOutlineUnlock size={18} />} label="Chính sách bảo mật" />
          <Row icon={<AiOutlineExport size={18} />} label="Gửi phản hồi" />
        </section>
      </div>

      {/* rating */}
      <section className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-sky-50 to-brand-50 p-5 ring-1 ring-brand-100">
        <div>
          <p className="text-lg font-bold text-slate-900">Đánh giá Aloca</p>
          <p className="text-sm text-slate-600">
            Giúp chúng tôi nâng cao chất lượng dịch vụ
          </p>
          <button type="button" className="btn btn-primary mt-3 py-2">
            Đánh giá
          </button>
        </div>
        <img src={userImg} alt="" className="w-24 shrink-0 md:w-28" />
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-50">
        <IoLogOutOutline size={20} />
        Đăng xuất
      </button>
    </div>
  );
}
