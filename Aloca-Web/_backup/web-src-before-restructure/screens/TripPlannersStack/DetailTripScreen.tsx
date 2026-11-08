import {ChangeEvent, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import {
  IoArrowBack,
  IoCalendarOutline,
  IoCamera,
  IoCheckmarkCircle,
  IoChevronDown,
  IoLocationOutline,
  IoMap,
  IoTimeOutline,
} from 'react-icons/io5';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {api} from '../../api/client';
import {storage as firebaseStorage} from '../../firebase/firebaseConfig';
import {addCommas, convertDatetoString2} from '../../Helper/convertDate';
import {getCurrentPosition} from '../../Helper/location';
import ConfirmModal from '../../components/ConfirmModal';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';
import {routes} from '../../navigation/routes';
import {images} from './provicesBgImg';

export interface Challenge {
  _id: string;
  challengeSummary: string;
  location?: string;
  latitude: string;
  longitude: string;
  points: number;
  imageUrl?: string;
  completed?: boolean;
}
export interface TripDay {
  title: string;
  date: string;
  challenges: Challenge[];
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
}
export interface TripDetail {
  location: string;
  startDate: string;
  endDate: string;
  dataTripDays: TripDay[];
}

export const useTripDetail = (idTrip: string | undefined) =>
  useQuery<TripDetail>({
    queryKey: ['trip', idTrip],
    enabled: !!idTrip,
    queryFn: async () =>
      (await api.get(`/trip-plan/get-trip/${idTrip}`)).data.tripDatas,
  });

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Cost({label, value}: {label: string; value?: number}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{addCommas(value)} VND</p>
      <p className="text-[11px] text-slate-400">/người · ước tính</p>
    </div>
  );
}

export const DetailTripScreen = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {idTrip} = useParams();
  const {data: result, isLoading, isError} = useTripDetail(idTrip);

  const [selectDay, setselectDay] = useState<string[]>(['1']);
  const [imageSource, setImageSource] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [retake, setRetake] = useState<{id: string; points: number} | null>(
    null,
  );
  const [heroError, setHeroError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<{id: string; points: number} | null>(null);

  const handleSelectChange = (item: string) => {
    setselectDay(prev =>
      prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item],
    );
  };

  // launchCamera on mobile -> file input with capture (opens the camera on
  // phones, a file picker on desktop)
  const handleAddImage = (id: string, points: number) => {
    pending.current = {id, points};
    fileInput.current?.click();
  };

  const checkChallengeProgress = async (
    chaId: string,
    file: File,
    point: number,
  ) => {
    setUploading(chaId);
    try {
      let coords;
      try {
        coords = await getCurrentPosition();
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Thông báo',
          text2: 'Vui lòng bật định vị để sử dụng ứng dụng.',
        });
        return;
      }
      const res = await api.post('/challenge/checkProgress', {
        chaId,
        lat: coords.latitude,
        lng: coords.longitude,
      });

      if (res.data.distance < 250) {
        const fileRef = ref(firebaseStorage, `${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file, {contentType: file.type});
        const url = await getDownloadURL(fileRef);
        await api.post('/challenge/updateProgress', {chaId, imageUrl: url});
        setImageSource(prev => ({...prev, [chaId]: url}));
        Toast.show({
          type: 'success',
          text1: 'Thành công',
          text2: 'Bạn đã nhận được ' + point?.toString() + ' điểm',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Thất bại',
          text2: 'Bạn đang đứng xa địa điểm',
        });
      }
    } catch (error) {
      console.log(error);
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Không thể cập nhật thử thách',
      });
    } finally {
      setUploading(null);
      queryClient.invalidateQueries({queryKey: ['trip', idTrip]});
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pending.current;
    e.target.value = '';
    pending.current = null;
    if (file && target) {
      checkChallengeProgress(target.id, file, target.points);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-2 pb-6 md:px-6">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200 md:h-72" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
        {[0, 1].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="px-4 pt-2 pb-6 md:px-6">
        <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <p className="font-semibold text-slate-900">Không tải được kế hoạch.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(routes.AddNewTrip)}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const location = result.location;
  const challenges = result.dataTripDays.flatMap(d => d.challenges);
  const isDone = (c: Challenge) => c.completed || !!imageSource[c._id];
  const doneCount = challenges.filter(isDone).length;
  const earned = challenges.filter(isDone).reduce((s, c) => s + (c.points ?? 0), 0);
  const totalPoints = challenges.reduce((s, c) => s + (c.points ?? 0), 0);

  return (
    <div className="space-y-4 px-4 pt-2 pb-6 md:px-6">
      {/* hero */}
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-800 shadow-soft md:h-72">
        {images[location] && !heroError && (
          <img
            src={images[location]}
            alt=""
            onError={() => setHeroError(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Quay lại danh sách kế hoạch"
            onClick={() => navigate(routes.AddNewTrip)}
            className="grid size-10 place-items-center rounded-full bg-white/90 text-slate-800 backdrop-blur transition hover:bg-white">
            <IoArrowBack size={20} />
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.MapScreen(idTrip!))}
            className="flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-semibold text-slate-800 backdrop-blur transition hover:bg-white">
            <IoMap size={18} className="text-brand-600" />
            Xem bản đồ
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-5 text-white">
          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <IoCalendarOutline size={16} />
            {`${convertDatetoString2(result.startDate)} - ${convertDatetoString2(
              result.endDate,
            )}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{result.location}</h1>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Thử thách" value={`${doneCount}/${challenges.length}`} />
        <Stat label="Điểm đạt được" value={`${earned}/${totalPoints}`} />
        <Stat label="Số ngày" value={`${result.dataTripDays.length}`} />
      </div>
      {challenges.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{width: `${(doneCount / challenges.length) * 100}%`}}
          />
        </div>
      )}

      {/* days */}
      {result.dataTripDays.map((day, i) => {
        const index = (i + 1).toString();
        const open = selectDay.includes(index);
        return (
          <section key={index} className="card overflow-hidden">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => handleSelectChange(index)}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50">
              <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <span className="text-[10px] font-medium uppercase">Ngày</span>
                <span className="text-lg leading-none font-bold">{index}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-semibold text-slate-900">
                  {day.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <IoTimeOutline size={13} />
                  {convertDatetoString2(day.date)} · {day.challenges.length} thử
                  thách
                </span>
              </span>
              <IoChevronDown
                size={20}
                className={`shrink-0 text-slate-400 transition ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            {open && (
              <div className="space-y-3 border-t border-slate-100 p-4">
                {day.challenges.map(activity => {
                  const image = imageSource[activity._id] || activity.imageUrl;
                  const done = isDone(activity);
                  return (
                    <div
                      key={activity._id}
                      className="flex gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">
                          {activity.challengeSummary}
                        </p>
                        {activity.location && (
                          <p
                            className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"
                            title={activity.location}>
                            <IoLocationOutline size={13} className="shrink-0" />
                            <span className="truncate">{activity.location}</span>
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              done
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                            {done && <IoCheckmarkCircle size={13} />}
                            {done ? 'Hoàn thành' : 'Chưa hoàn thành'}
                          </span>
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            Điểm: {activity.points}
                          </span>
                        </div>
                      </div>
                      <div className="grid w-24 shrink-0 place-items-center md:w-28">
                        {uploading === activity._id ? (
                          <Spinner size={28} />
                        ) : image ? (
                          <button
                            type="button"
                            disabled={activity.completed}
                            title={activity.completed ? undefined : 'Chụp lại ảnh'}
                            onClick={() =>
                              setRetake({id: activity._id, points: activity.points})
                            }
                            className="h-20 w-full overflow-hidden rounded-lg disabled:cursor-default disabled:opacity-100">
                            <img
                              src={image}
                              alt={activity.challengeSummary}
                              className="size-full object-cover"
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary w-full px-2 py-2 text-xs"
                            onClick={() =>
                              handleAddImage(activity._id, activity.points)
                            }>
                            <IoCamera size={16} />
                            Thêm ảnh
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="grid gap-2 sm:grid-cols-3">
                  <Cost label="Chi phí di chuyển" value={day.transportCost} />
                  <Cost label="Chi phí ăn uống" value={day.foodCost} />
                  {day.otherCost ? (
                    <Cost label="Chi phí khác" value={day.otherCost} />
                  ) : null}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />

      <ConfirmModal
        visible={retake !== null}
        title="Bạn có muốn chụp lại ảnh?"
        onCancel={() => setRetake(null)}
        onConfirm={() => {
          if (retake) {
            handleAddImage(retake.id, retake.points);
          }
          setRetake(null);
        }}
      />
    </div>
  );
};
