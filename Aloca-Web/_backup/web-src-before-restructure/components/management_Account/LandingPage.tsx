import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {IoArrowForward} from 'react-icons/io5';
import {getUser, storage} from '../../Helper/storage';
import {routes} from '../../navigation/routes';
import logo from '../../assets/images/Icon.png';
import cover from '../../assets/images/hagiangImage1.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  // read once, so the check is stable across re-renders / StrictMode effects
  const [firstVisit] = useState(
    () => !storage.getItem('hasShownWelcomeScreen'),
  );

  useEffect(() => {
    if (firstVisit) {
      // Đánh dấu rằng đã hiển thị màn hình chào mừng
      storage.setItem('hasShownWelcomeScreen', 'true');
    } else {
      // Chuyển đến màn hình chính
      navigate(getUser() ? routes.Home : routes.Login, {replace: true});
    }
  }, [firstVisit, navigate]);

  const handleGetStart = () => {
    navigate(getUser() ? routes.Home : routes.Login);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-brand-800">
      <img
        src={cover}
        alt=""
        className="absolute inset-0 size-full scale-105 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-900/30" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-between px-6 py-8 md:px-10 md:py-12">
        <div className="flex items-center gap-3 text-white">
          <img src={logo} alt="" className="size-10 rounded-xl" />
          <span className="text-xl font-extrabold tracking-tight">Aloca</span>
        </div>

        <div className="max-w-xl animate-fade-in pb-4 text-white md:pb-10">
          <span className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
            Trợ lý du lịch thông minh
          </span>
          <h1 className="text-4xl leading-tight font-bold md:text-6xl">
            Chào mừng bạn
            <br />
            đến với <span className="text-brand-300">ALOCA</span>
          </h1>
          <p className="mt-4 text-base text-white/80 md:text-lg">
            Lên kế hoạch chuyến đi, trò chuyện với trợ lý AI và chinh phục thử
            thách ở khắp Việt Nam.
          </p>
          <button
            type="button"
            onClick={handleGetStart}
            className="btn btn-primary mt-8 h-12 px-7 text-base">
            Bắt đầu thôi
            <IoArrowForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
