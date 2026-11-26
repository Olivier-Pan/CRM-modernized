
interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label }: SpinnerProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--text-secondary)',
        fontSize: 13.5,
      }}
    >
      <div
        style={{
          width: 15,
          height: 15,
          border: '2px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'crmSpin 0.75s linear infinite',
        }}
      />
      {label && <span>{label}</span>}
    </div>
  );
}