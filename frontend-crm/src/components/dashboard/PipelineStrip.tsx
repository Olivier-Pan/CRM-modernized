import { useNavigate } from 'react-router-dom';
import { getStatusLabel, getStatusVars, PIPELINE_STATUSES } from '../../lib/status';
import type { Company } from '../../types';

interface PipelineStripProps {
  companies: Company[];
}

export default function PipelineStrip({ companies }: PipelineStripProps) {
  const navigate = useNavigate();
  const total = companies.length;
  const signedCount = companies.filter((c) => c.global_status === 'Signed').length;
  const signedReadyCount = companies.filter(
    (c) => c.global_status === 'Signed' && Boolean(c.company_password)
  ).length;

  return (
    <div className="crm-card" style={{ padding: 18, marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pipeline global
          </h2>
          <span className="tabular-nums" style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {total} entreprise{total > 1 ? 's' : ''} en base
          </span>
        </div>

        {signedCount > 0 && (
          <span
            className="tabular-nums"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '3px 9px',
              borderRadius: 6,
            }}
          >
            Accès portail générés : <strong>{signedReadyCount}</strong> / {signedCount} signées
          </span>
        )}
      </div>

      {/* Grille alignée des 5 étapes actives */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: 10,
        }}
      >
        {PIPELINE_STATUSES.map((status) => {
          const count = companies.filter((c) => c.global_status === status).length;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          const vars = getStatusVars(status);

          return (
            <button
              key={status}
              type="button"
              onClick={() => navigate(`/companies?statuses=${status}`)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'border-color 0.12s ease, background-color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'var(--bg-subtle)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: vars.text,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {getStatusLabel(status)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  {count}
                </span>
                <span className="tabular-nums" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                  {share}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}