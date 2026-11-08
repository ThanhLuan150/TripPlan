import {IoCalendarOutline, IoCompassOutline, IoOptionsOutline} from 'react-icons/io5';
import Page from '../Page';

const benefits = [
  {
    icon: IoCalendarOutline,
    title: 'Lập kế hoạch chuyến đi dễ dàng',
    text: 'Aloca App cung cấp các tính năng giúp người dùng lập kế hoạch cho chuyến đi của họ một cách thuận tiện. Từ việc tìm kiếm điểm đến, xác định thời gian và ngân sách.',
  },
  {
    icon: IoOptionsOutline,
    title: 'Tùy chỉnh lịch trình',
    text: 'Ứng dụng này cho phép người dùng tùy chỉnh lịch trình của họ dựa trên sở thích và nhu cầu cá nhân.',
  },
  {
    icon: IoCompassOutline,
    title: 'Thông tin và gợi ý du lịch',
    text: 'Aloca App cung cấp thông tin chi tiết về các điểm đến, bao gồm thông tin về các địa điểm tham quan, nhà hàng, hoạt động giải trí, và nhiều hơn nữa. Điều này giúp người dùng có cái nhìn tổng quan về điểm đến của mình và có thể lựa chọn những hoạt động phù hợp với sở thích của họ.',
  },
];

export default function Benefit() {
  return (
    <Page title="Lợi ích">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Lợi ích khi dùng Aloca
        </h1>
        <p className="mt-1 text-slate-500">
          Những điều Aloca giúp bạn trong mỗi chuyến đi.
        </p>
      </div>
      <div className="space-y-3">
        {benefits.map(({icon: Icon, title, text}) => (
          <section key={title} className="card flex gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon size={24} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {text}
              </p>
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
