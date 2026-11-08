import {IoCalculatorOutline, IoChatbubblesOutline, IoGameControllerOutline} from 'react-icons/io5';
import Page from '../Page';
import cover from '../../assets/images/hagiangImage.jpg';

const highlights = [
  {icon: IoGameControllerOutline, text: 'Lên kế hoạch dễ như chơi game'},
  {icon: IoCalculatorOutline, text: 'Ước lượng chi phí chuyến đi'},
  {icon: IoChatbubblesOutline, text: 'Chat với trí tuệ nhân tạo'},
];

export default function WhatAloca() {
  return (
    <Page title="Aloca là gì">
      <article className="card overflow-hidden">
        <img src={cover} alt="" className="aspect-[16/7] w-full object-cover" />
        <div className="space-y-5 p-5 md:p-7">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Aloca là gì?
          </h1>
          <p className="leading-relaxed text-slate-600">
            Aloca là ứng dụng du lịch độc đáo, ứng dụng có thể giúp người dùng
            lên kế hoạch chuyến đi dễ dàng như chơi game, từ đó người dùng có
            thể ước lượng được các chi phí mình có thể đi. Người dùng có thể
            chat với trí tuệ nhân tạo, và nhận được gợi ý thông minh với những
            lịch trình được tối ưu hóa hơn. Aloca mang lại trải nghiệm du lịch
            độc đáo và thuận lợi.
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {highlights.map(({icon: Icon, text}) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-800">
                <Icon size={22} className="shrink-0 text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </Page>
  );
}
