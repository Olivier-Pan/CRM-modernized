import type { WeeklyProgressSummary } from '../../lib/goals';
import ProgressBar from '../ui/ProgressBar';

interface WeeklyProgressRowProps {
  individual: WeeklyProgressSummary;
  team: WeeklyProgressSummary;
}

export default function WeeklyProgressRow({ individual, team }: WeeklyProgressRowProps) {
  return (
    <div className="crm-grid-2" style={{ marginBottom: 20 }}>
      {/* Carte 1 : Objectifs individuels */}
      <div className="crm-card" style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              Ma semaine
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
              Objectif personnel · réinitialisé chaque lundi
            </p>
          </div>
          {individual.newContacts.completed && individual.relances.completed && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--status-success-bg)',
                border: '1px solid var(--status-success-border)',
                color: 'var(--status-success-text)',
              }}
            >
              Objectifs atteints
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressBar
            label="Nouvelles entreprises contactées"
            valueLabel={`${individual.newContacts.current} / ${individual.newContacts.target}`}
            percent={individual.newContacts.percent}
            completed={individual.newContacts.completed}
            hint={
              individual.newContacts.completed
                ? 'Objectif hebdomadaire validé.'
                : `Encore ${individual.newContacts.target - individual.newContacts.current} premier${
                    individual.newContacts.target - individual.newContacts.current > 1 ? 's' : ''
                  } contact${
                    individual.newContacts.target - individual.newContacts.current > 1 ? 's' : ''
                  } cette semaine.`
            }
          />

          <ProgressBar
            label="Mes relances (+7j)"
            valueLabel={
              individual.overdueCount === 0
                ? 'À jour'
                : `${individual.relances.current} / ${individual.relances.target}`
            }
            percent={individual.overdueCount === 0 ? 100 : individual.relances.percent}
            completed={individual.overdueCount === 0}
            hint={
              individual.overdueCount === 0
                ? 'Aucune relance en retard.'
                : `${individual.overdueCount} entreprise${
                    individual.overdueCount > 1 ? 's' : ''
                  } à relancer dans ton plan d'action.`
            }
          />
        </div>
      </div>

      {/* Carte 2 : Objectifs de l'équipe */}
      <div className="crm-card" style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              Semaine de l'équipe
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
              Avancement collectif sur l'édition en cours
            </p>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {team.newContacts.percent}%
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProgressBar
            label="Nouvelles entreprises contactées (équipe)"
            valueLabel={`${team.newContacts.current} / ${team.newContacts.target}`}
            percent={team.newContacts.percent}
            completed={team.newContacts.completed}
            hint={
              team.newContacts.completed
                ? 'Objectif collectif atteint cette semaine.'
                : `${Math.max(0, team.newContacts.target - team.newContacts.current)} contacts restants pour atteindre l'objectif hebdomadaire.`
            }
          />

          <ProgressBar
            label="Suivi des relances de l'équipe"
            valueLabel={
              team.overdueCount === 0
                ? 'À jour'
                : `${team.relances.current} / ${team.relances.target}`
            }
            percent={team.overdueCount === 0 ? 100 : team.relances.percent}
            completed={team.overdueCount === 0}
            hint={
              team.overdueCount === 0
                ? 'Toutes les entreprises contactées sont à jour.'
                : `${team.overdueCount} dossier${
                    team.overdueCount > 1 ? 's' : ''
                  } en attente de relance (+7j) dans l'équipe.`
            }
          />
        </div>
      </div>
    </div>
  );
}