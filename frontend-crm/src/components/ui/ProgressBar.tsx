
interface ProgressBarProps {
  label: string;
  valueLabel: string;
  percent: number;
  completed?: boolean;
  hint?: string;
}

export default function ProgressBar({
  label,
  valueLabel,
  percent,
  completed = false,
  hint,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          className="tabular-nums"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: completed ? 'var(--status-success-text)' : 'var(--text-primary)',
          }}
        >
          {valueLabel}
        </span>
      </div>

      <div className="crm-progress-track">
        <div
          className="crm-progress-fill"
          style={{
            width: `${clamped}%`,
            background: completed ? 'var(--status-success-text)' : 'var(--accent)',
          }}
        />
      </div>

      {hint && (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{hint}</span>
      )}
    </div>
  );
}