import { useMemo, useState } from 'react';
import type { ActivityLog } from '../../api/logs';
import { cleanActivityLogs } from '../../lib/dashboardMetrics';
import { formatDateTimeCET } from '../../lib/dates';
import { getStatusLabel } from '../../lib/status';
import StatusBadge from '../ui/StatusBadge';

interface LiveFeedPanelProps {
  logs: ActivityLog[];
}

export default function LiveFeedPanel({ logs }: LiveFeedPanelProps) {
  const [filter, setFilter] = useState<'all' | 'milestones'>('all');
  const visibleLogs = useMemo(() => cleanActivityLogs(logs, filter), [logs, filter]);

  return (
    <div
      className="crm-card"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        height: 430,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Activité récente
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Changements de statut de l'équipe
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 2,
            borderRadius: 6,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {(
            [
              { id: 'all', label: 'Tout' },
              { id: 'milestones', label: 'Jalons clés' },
            ] as const
          ).map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                style={{
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 5,
                  border: 'none',
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 11.5,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          paddingRight: 4,
        }}
      >
        {visibleLogs.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 20,
              fontSize: 13,
              color: 'var(--text-tertiary)',
            }}
          >
            Aucune activité correspondante.
          </div>
        ) : (
          visibleLogs.map((log, idx) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 0',
                borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {log.member_name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {log.member_name}
                  </strong>{' '}
                  a passé{' '}
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {log.company_name}
                  </strong>{' '}
                  de <span style={{ color: 'var(--text-tertiary)' }}>{getStatusLabel(log.old_status)}</span> à{' '}
                  <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
                    <StatusBadge status={log.new_status} />
                  </span>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3 }}
                >
                  {formatDateTimeCET(log.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}