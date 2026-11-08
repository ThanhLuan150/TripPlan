// Replaces RN <ActivityIndicator>.
export default function Spinner({
  size = 24,
  color = '#2ab6ad',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      role="progressbar"
      aria-label="Đang tải"
      className={`inline-block shrink-0 animate-spin rounded-full border-solid ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 10)),
        borderColor: color,
        borderRightColor: 'transparent',
      }}
    />
  );
}
