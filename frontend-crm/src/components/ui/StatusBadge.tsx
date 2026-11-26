import { getStatusLabel, getStatusVars } from '../../lib/status';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const vars = getStatusVars(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        color: vars.text,
        background: vars.bg,
        border: `1px solid ${vars.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: vars.text,
          flexShrink: 0,
        }}
      />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}