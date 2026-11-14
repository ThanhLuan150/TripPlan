import type {IconType} from 'react-icons';
import {adminIconButton} from './styles';

// Icon button of a table row ("Delete Nguyễn Văn An"); the label is its
// accessible name and tooltip.
export default function AdminRowAction({
  label,
  icon: Icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: IconType;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`${adminIconButton} ${danger ? 'hover:bg-rose-50 hover:text-rose-600' : ''}`}>
      <Icon size={16} aria-hidden />
    </button>
  );
}
