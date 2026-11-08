import {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {IoChevronForward} from 'react-icons/io5';

export default function SectionHeader({
  title,
  to,
  linkText = 'Xem thêm',
  icon,
}: {
  title: ReactNode;
  to?: string;
  linkText?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700">
          {linkText}
          <IoChevronForward size={16} />
        </Link>
      )}
    </div>
  );
}
