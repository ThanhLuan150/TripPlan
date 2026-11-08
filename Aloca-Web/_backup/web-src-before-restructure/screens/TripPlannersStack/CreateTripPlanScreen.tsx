import {ReactNode, useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
  IoAdd,
  IoArrowBack,
  IoCalendarOutline,
  IoCheckmark,
  IoChevronDown,
  IoHeartOutline,
  IoLocationOutline,
  IoPeopleOutline,
  IoRemove,
  IoSparkles,
  IoWalletOutline,
} from 'react-icons/io5';
import {provices} from '../../Helper/provices';
import {removeVietnameseTones} from '../../Helper/removeVietNamTone';
import {addCommas, fromInputDate, toInputDate} from '../../Helper/convertDate';
import {storage} from '../../Helper/storage';
import Toast from '../../components/Toast';
import {routes} from '../../navigation/routes';

const AreaTypes = [
  'Phù hợp với trẻ em',
  'Hoạt động ngoài trời',
  'Nghệ thuật & văn hóa',
  'Lịch sử',
  'Triển lãm',
  'Giải trí',
  'Mua sắm',
];

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export interface GenerateTripParams {
  location: string;
  quantity: number;
  budget: string;
  areaTypes: string[];
  userLocation: string | null;
  days: number;
  startDate: string;
  endDate: string;
}

const useSearch = (string: string) =>
  provices.filter(
    value =>
      removeVietnameseTones(value.toLowerCase()).includes(string.toLowerCase()) ||
      value.toLowerCase().includes(string.toLowerCase()),
  );

// Close a dropdown when clicking outside of it.
const useClickOutside = (onOutside: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
};

function FormSection({
  icon,
  title,
  hint,
  children,
  labelFor,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
  labelFor?: string;
}) {
  return (
    <section>
      <label
        htmlFor={labelFor}
        className="mb-2.5 flex items-center gap-2 font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        {title}
        {hint && <span className="text-sm font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </section>
  );
}

export const TripPlanChoose = () => {
  const navigate = useNavigate();
  const prefill = (useLocation().state as {location?: string} | null)?.location;

  const [proviceShow, setProviceShow] = useState(!!prefill);
  const [location, onChangeLocation] = useState(prefill ?? '');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [quantity, setQuantity] = useState(1);
  const [quantityText, setQuantityText] = useState('1');
  const [budget, setBudget] = useState('');
  const [areaTypes, setAreaTypes] = useState<string[]>([]);

  const provinceRef = useClickOutside(() => setProviceShow(false));

  const budgetList = [
    {
      tier: 'Tiết kiệm',
      value: `Dưới ${addCommas(1000000 * quantity)} VND`,
    },
    {
      tier: 'Vừa phải',
      value: `${addCommas(1000000 * quantity)} VND - ${addCommas(
        5000000 * quantity,
      )} VND`,
    },
    {
      tier: 'Thoải mái',
      value: `${addCommas(5000000 * quantity)} VND - ${addCommas(
        15000000 * quantity,
      )} VND`,
    },
  ];

  const provinceFilter = useSearch(location);
  const dayCount =
    Math.round((startOfDay(endDate) - startOfDay(startDate)) / DAY) + 1;

  const handleSelectChange = (item: string) => {
    setAreaTypes(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item],
    );
  };

  const handleStartDate = (value: string) => {
    if (!value) {
      return;
    }
    const selectedDate = fromInputDate(value);
    const today = new Date();
    if (startOfDay(selectedDate) < startOfDay(today)) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Không được chọn trước ngày hôm nay',
      });
    } else if (
      startOfDay(selectedDate) === startOfDay(today) &&
      today.getHours() >= 18
    ) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Hôm nay muộn quá bạn ơi',
      });
    } else {
      setStartDate(selectedDate);
      if (startOfDay(endDate) < startOfDay(selectedDate)) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDate = (value: string) => {
    if (!value) {
      return;
    }
    const selectedDate = fromInputDate(value);
    if (startOfDay(selectedDate) >= startOfDay(startDate)) {
      setEndDate(selectedDate);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Ngày về không được chọn trước ngày đi',
      });
    }
  };

  const handleCalculateDateRange = () => {
    if (startOfDay(startDate) > startOfDay(endDate)) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Vui lòng chọn lại ngày',
      });
      return undefined;
    }
    return dayCount;
  };

  const updateQuantity = (newQuantity: number) => {
    const clamped = Math.max(1, Math.min(10, Math.floor(newQuantity)));
    // budget ranges depend on the number of people
    if (clamped !== quantity) {
      setBudget('');
    }
    setQuantity(clamped);
    setQuantityText(clamped.toString());
  };

  const handleQuantityInput = (text: string) => {
    setQuantityText(text);
    const n = parseInt(text, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(1, Math.min(10, n));
      if (clamped !== quantity) {
        setBudget('');
      }
      setQuantity(clamped);
    }
  };

  const validate = () =>
    location !== '' && provices.includes(location) && budget !== '';

  const handleReset = () => {
    onChangeLocation('');
    setStartDate(new Date());
    setEndDate(new Date());
    updateQuantity(1);
    setBudget('');
    setAreaTypes([]);
  };

  const handleNext = () => {
    const days = handleCalculateDateRange();
    if (days !== undefined && days <= 7 && validate()) {
      const params: GenerateTripParams = {
        location,
        quantity,
        budget,
        areaTypes,
        userLocation: storage.getItem('userLocation'),
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      navigate(routes.GenerateTripsScreen, {state: params});
      return;
    }
    if (days !== undefined && days > 7) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: 'Chúng tôi chỉ có thể tạo cho bạn kế hoạch tối đa 7 ngày',
      });
    }
    if (!validate()) {
      Toast.show({
        type: 'error',
        text1: 'Thất bại',
        text2: provices.includes(location)
          ? 'Vui lòng điền đầy đủ thông tin!'
          : 'Vui lòng chọn đúng tỉnh, thành phố mà chúng tôi đã cung cấp',
      });
    }
  };

  return (
    <div className="px-4 pt-2 pb-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(routes.AddNewTrip)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:bg-slate-50">
            <IoArrowBack size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Lên kế hoạch chuyến đi
            </h1>
            <p className="text-sm text-slate-500">
              Cho Aloca biết bạn muốn đi đâu, phần còn lại để AI lo
            </p>
          </div>
        </div>

        <div className="card space-y-7 p-5 md:p-7">
          {/* Province */}
          <FormSection
            icon={<IoLocationOutline size={18} />}
            title="Đâu sẽ là nơi bạn đến?"
            labelFor="province">
            <div className="relative" ref={provinceRef}>
              <input
                id="province"
                className="field pr-11"
                placeholder="Tỉnh, thành phố bạn sẽ tới là?"
                autoComplete="off"
                value={location}
                onChange={e => {
                  onChangeLocation(e.target.value);
                  setProviceShow(true);
                }}
                onFocus={() => setProviceShow(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && provinceFilter.length > 0) {
                    e.preventDefault();
                    onChangeLocation(provinceFilter[0]);
                    setProviceShow(false);
                  } else if (e.key === 'Escape') {
                    setProviceShow(false);
                  }
                }}
              />
              <button
                type="button"
                aria-label="Danh sách tỉnh thành"
                onClick={() => {
                  setProviceShow(!proviceShow);
                  onChangeLocation('');
                }}
                className="absolute top-1 right-1 grid size-10 place-items-center rounded-lg text-slate-400 hover:text-slate-600">
                <IoChevronDown
                  size={18}
                  className={`transition ${proviceShow ? 'rotate-180' : ''}`}
                />
              </button>
              {proviceShow && provinceFilter.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute inset-x-0 z-20 mt-2 max-h-64 animate-fade-in overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-100">
                  {provinceFilter.map(item => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => {
                          onChangeLocation(item);
                          setProviceShow(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-brand-50 ${
                          item === location
                            ? 'font-semibold text-brand-700'
                            : 'text-slate-700'
                        }`}>
                        {item}
                        {item === location && <IoCheckmark size={16} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>

          {/* Dates */}
          <FormSection
            icon={<IoCalendarOutline size={18} />}
            title="Thời gian"
            hint={`(${dayCount} ngày, tối đa 7)`}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Ngày đi
                </span>
                <input
                  type="date"
                  className="field"
                  value={toInputDate(startDate)}
                  min={toInputDate(new Date())}
                  onChange={e => handleStartDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Ngày về
                </span>
                <input
                  type="date"
                  className="field"
                  value={toInputDate(endDate)}
                  min={toInputDate(startDate)}
                  onChange={e => handleEndDate(e.target.value)}
                />
              </label>
            </div>
          </FormSection>

          {/* Number of people */}
          <FormSection
            icon={<IoPeopleOutline size={18} />}
            title="Số người?"
            hint="(Tối đa 10)"
            labelFor="quantity">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                aria-label="Giảm số người"
                disabled={quantity <= 1}
                onClick={() => updateQuantity(quantity - 1)}
                className="grid size-12 place-items-center text-slate-600 transition hover:text-brand-600 disabled:text-slate-300">
                <IoRemove size={20} />
              </button>
              <input
                id="quantity"
                inputMode="numeric"
                value={quantityText}
                onChange={e => handleQuantityInput(e.target.value)}
                onBlur={() => updateQuantity(quantity)}
                className="h-12 w-14 border-x border-slate-200 text-center text-lg font-semibold outline-none focus:bg-brand-50"
              />
              <button
                type="button"
                aria-label="Tăng số người"
                disabled={quantity >= 10}
                onClick={() => updateQuantity(quantity + 1)}
                className="grid size-12 place-items-center text-slate-600 transition hover:text-brand-600 disabled:text-slate-300">
                <IoAdd size={20} />
              </button>
            </div>
          </FormSection>

          {/* Budget */}
          <FormSection
            icon={<IoWalletOutline size={18} />}
            title="Kinh phí của bạn là bao nhiêu?">
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {budgetList.map(({tier, value}) => {
                const selected = budget === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBudget(value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                        : 'border-slate-200 hover:border-brand-300'
                    }`}>
                    <span
                      className={`flex items-center justify-between text-sm font-semibold ${
                        selected ? 'text-brand-700' : 'text-slate-900'
                      }`}>
                      {tier}
                      {selected && <IoCheckmark size={16} />}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* Area types */}
          <FormSection
            icon={<IoHeartOutline size={18} />}
            title="Kiểu địa điểm bạn muốn đến">
            <div className="flex flex-wrap gap-2">
              {AreaTypes.map(title => {
                const selected = areaTypes.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleSelectChange(title)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}>
                    {selected && <IoCheckmark size={15} />}
                    {title}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              className="btn btn-outline h-12 flex-1"
              onClick={handleReset}>
              Đặt lại
            </button>
            <button
              type="button"
              className="btn btn-primary h-12 flex-[2] text-base"
              onClick={handleNext}>
              <IoSparkles size={18} />
              Tạo kế hoạch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
