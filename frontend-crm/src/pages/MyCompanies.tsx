import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMySharks } from '../api/sharks';
import { listCompanies } from '../api/companies';
import type { Shark, Company } from '../types';
import PasswordChip from '../components/PasswordChip';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../types';

export default function MyCompanies() {
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function togglePassword(companyId: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  useEffect(() => {
    Promise.all([getMySharks(), listCompanies()])
      .then(([sharks, companies]) => {
        setSharks(sharks);
        setCompanies(companies);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Chargement…</div>;
  if (error) return <div style={{ padding: 40, color: '#f87171' }}>Erreur : {error}</div>;

  const myCompanies = sharks
    .map((shark) => {
      const company = companies.find((c) => c.id === shark.company_id);
      return company ? { shark, company } : null;
    })
    .filter((x): x is { shark: Shark; company: Company } => x !== null)
    .sort((a, b) => a.company.name.localeCompare(b.company.name));

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Prospection
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Mes entreprises
        </h1>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
          {myCompanies.length} entreprise{myCompanies.length !== 1 ? 's' : ''} assignee{myCompanies.length !== 1 ? 's' : ''}
        </p>
      </div>

      {myCompanies.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
            Vous n'etes encore assigné a aucune entreprise.
          </div>
          <Link to="/companies" style={{ fontSize: 13, color: '#0a0a0a', fontWeight: 600 }}>
            Voir toutes les entreprises
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myCompanies.map(({ shark, company }) => (
            <div
              key={shark.id}
              style={{
                background: '#fff',
                border: '1px solid #e8e8e8',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0a0a0a')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e8e8e8')}
            >
              <Link
                to={`/companies/${company.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    cursor: 'pointer',
                  }}
                >
                {/* Status indicator */}
                <div style={{
                  width: 4, flexShrink: 0, alignSelf: 'stretch',
                  background: SHARK_STATUS_COLORS[shark.status],
                  minHeight: 20,
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>
                      {company.name}
                    </div>
                    {company.sector && (
                      <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {company.sector}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: SHARK_STATUS_COLORS[shark.status],
                      background: SHARK_STATUS_COLORS[shark.status] + '18',
                      border: `1px solid ${SHARK_STATUS_COLORS[shark.status]}33`,
                      padding: '2px 8px',
                    }}>
                      {SHARK_STATUS_LABELS[shark.status]}
                    </span>

                    {company.global_status !== shark.status && (
                      <span style={{ fontSize: 11, color: '#aaa' }}>
                        Statut global : {SHARK_STATUS_LABELS[company.global_status]}
                      </span>
                    )}

                    {shark.contact_date && (
                      <span style={{ fontSize: 11, color: '#aaa' }}>
                        Contact le {formatDate(shark.contact_date)}
                      </span>
                    )}

                    {shark.contact_method && (
                      <span style={{ fontSize: 11, color: '#ccc' }}>
                        via {typeof shark.contact_method === 'string' ? shark.contact_method : (shark.contact_method as { Other: string }).Other}
                      </span>
                    )}
                  </div>

                  {shark.notes && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#888', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{shark.notes}"
                    </div>
                  )}
                </div>

                  <div style={{ fontSize: 18, color: '#ccc', flexShrink: 0 }}>
                    &rarr;
                  </div>
                </div>
              </Link>

              {/* Hors du <a> : pas de contenu interactif imbrique. */}
              <div style={credRowStyle}>
                <span style={credLabelStyle}>Accès exposant</span>
                <code style={credCodeStyle}>{company.name}</code>
                <PasswordChip
                  password={company.company_password}
                  revealed={revealed.has(company.id)}
                  onToggle={() => togglePassword(company.id)}
                  companyName={company.name}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const credRowStyle: React.CSSProperties = {
  borderTop: '1px solid #f0f0f0',
  background: '#fcfcfc',
  padding: '10px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};
const credLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#bbb',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};
const credCodeStyle: React.CSSProperties = {
  background: '#f5f5f5',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  color: '#333',
};
