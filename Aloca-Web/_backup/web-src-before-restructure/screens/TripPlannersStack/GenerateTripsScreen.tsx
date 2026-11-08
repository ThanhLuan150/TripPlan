import {useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {IoArrowBack, IoRefresh, IoSparkles} from 'react-icons/io5';
import {api} from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';
import {routes} from '../../navigation/routes';
import type {GenerateTripParams} from './CreateTripPlanScreen';
import sorry from '../../assets/images/sorry.png';

interface Activity {
  challenge_summary: string;
  google_maps_address?: string;
  level_of_difficult?: string;
}
interface Day {
  title: string;
  activities?: Activity[];
}
type Plan = Record<string, Day>;

export const GenerateTripsScreen = () => {
  const navigate = useNavigate();
  const params = useLocation().state as GenerateTripParams | null;
  const [planName, onChangePlanName] = useState('');
  const [planConfirm, setPlanConfirm] = useState<Day[] | null>(null);

  // Generating plans is slow (AI), so the result is cached per form input and
  // not refetched automatically. "Thử lại" calls refetch().
  const {data: result, isFetching, isError, refetch} = useQuery<
    Record<string, Plan> | null
  >({
    queryKey: ['generateTrip', params],
    enabled: params !== null,
    queryFn: async () => {
      const res = await api.post('/trip-plan/', {
        location: params!.location,
        numberOfPeople: params!.quantity,
        budget: params!.budget,
        interest: params!.areaTypes,
        userLocation: params!.userLocation,
        numberOfDay: params!.days,
      });
      return res.data.data ?? null;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (item: {planName: string; planConfirm: Day[]}) => {
      const res = await api.post('/trip-plan/save-trip', {
        jsonTrip: item.planConfirm,
        location: params!.location,
        startDate: params!.startDate,
        endDate: params!.endDate,
        nameTrip: item.planName,
      });
      return res.data;
    },
    onSuccess: data => {
      navigate(routes.DetailTripScreen(data?.tripId), {replace: true});
    },
    onError: error => {
      console.error('Lỗi:', error);
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Lưu kế hoạch không thành công',
      });
    },
  });

  if (!params) {
    return <Navigate to={routes.TripPlanChoose} replace />;
  }

  const loading = isFetching || saveMutation.isPending;

  const handleConfirm = () => {
    if (planName.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng nhập tên kế hoạch',
      });
      return;
    }
    if (planConfirm) {
      saveMutation.mutate({planName: planName.trim(), planConfirm});
    }
    onChangePlanName('');
    setPlanConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="relative grid size-24 place-items-center">
          <Spinner size={96} className="absolute inset-0" />
          <IoSparkles size={34} className="animate-pulse text-brand-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">Vui lòng chờ</p>
          <p className="mt-1 text-sm text-slate-500">
            {saveMutation.isPending
              ? 'Đang lưu kế hoạch của bạn...'
              : `Aloca đang lên kế hoạch cho chuyến đi ${params.location}. Việc này có thể mất một lúc.`}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="px-4 pt-2 pb-6 md:px-6">
        <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <img src={sorry} alt="" className="h-40 object-contain" />
          <h2 className="text-xl font-bold text-slate-900">
            Gặp sự cố rồi bạn ơi!
          </h2>
          <p className="text-sm text-slate-500">
            Không tạo được kế hoạch lúc này. Bạn thử lại nhé.
          </p>
          <div className="mt-2 flex w-full gap-3">
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={() => navigate(-1)}>
              Quay lại
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={() => refetch()}>
              <IoRefresh size={18} />
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-6 md:px-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:bg-slate-50">
          <IoArrowBack size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            Gợi ý cho chuyến đi {params.location}
          </h1>
          <p className="truncate text-sm text-slate-500">
            {params.days} ngày · {params.quantity} người · {params.budget}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {Object.values(result).map((plan, planIndex) => (
          <section key={planIndex} className="card flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                Kế hoạch {planIndex + 1}
              </span>
              <span className="text-sm text-slate-500">{params.location}</span>
            </div>
            <ol className="ml-3 space-y-5 border-l-2 border-brand-100">
              {Object.values(plan).map((day, dayIndex) => (
                <li key={dayIndex} className="relative pl-6">
                  <span className="absolute top-1 -left-[9px] size-4 rounded-full bg-brand-500 ring-4 ring-white" />
                  <p className="font-semibold text-slate-900">
                    <span className="text-brand-600">Ngày {dayIndex + 1}</span> ·{' '}
                    {day.title}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                    {day.activities?.map((activity, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
                        {activity.challenge_summary}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-primary mt-6 h-11 w-full"
              onClick={() => setPlanConfirm(Object.values(plan))}>
              Chọn kế hoạch này
            </button>
          </section>
        ))}
      </div>

      <ConfirmModal
        visible={planConfirm !== null}
        title="Đặt tên cho kế hoạch"
        onCancel={() => {
          setPlanConfirm(null);
          onChangePlanName('');
        }}
        onConfirm={handleConfirm}>
        <input
          className="field"
          maxLength={35}
          autoFocus
          value={planName}
          placeholder={`Ví dụ: ${params.location} ${params.days} ngày`}
          aria-label="Tên kế hoạch"
          onChange={e => onChangePlanName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </ConfirmModal>
    </div>
  );
};
