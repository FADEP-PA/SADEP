export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
