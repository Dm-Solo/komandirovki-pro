export default function StatusBadge({
  label,
  bg,
  color,
  small,
}: {
  label: string;
  bg: string;
  color: string;
  small?: boolean;
}) {
  return (
    <span
      className={
        small
          ? "text-[10.5px] font-bold py-[3px] px-[9px] rounded-full inline-block whitespace-nowrap"
          : "text-[11px] font-bold py-1 px-2.5 rounded-full inline-block whitespace-nowrap"
      }
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
