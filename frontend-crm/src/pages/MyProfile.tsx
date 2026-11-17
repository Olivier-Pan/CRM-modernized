import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMySharks } from '../api/sharks';
import { listCompanies } from '../api/companies';
import { getMe } from '../api/auth';
import type { Shark, Company, AuthUser } from '../types';
import { SHARK_STATUS_LABELS, SHARK_STATUS_COLORS } from '../types';

export default function MyProfile() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMe(), getMySharks(), listCompanies()])
      .then(([me, sharks, companies]) => {
        setMe(me as AuthUser);
        setSharks(sharks);
        setCompanies(companies);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getCompanyName = (companyId: string) =>
    companies.find((c) => c.id === companyId)?.name || companyId;

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Chargement…</div>;
  if (error) return <div style={{ padding: 40, color: '#f87171' }}>Erreur : {error}</div>;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Compte
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.03em' }}>Mon profil</h1>
        {me && (
          <div style={{ color: '#888', fontSize: 13 }}>
            {me.email} · <span style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 0,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: me.role === 'Admin' ? '#0a0a0a' : '#f5f5f5',
              color: me.role === 'Admin' ? '#fff' : '#555',
              marginLeft: 2,
            }}>{me.role}</span>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 0, border: '1px solid #e8e8e8', padding: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#0a0a0a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Mes sharks ({sharks.length})
        </h2>

        {sharks.length === 0 && (
          <div style={{ color: '#aaa', fontSize: 13 }}>
            Vous n'êtes encore assigné à aucune entreprise.{' '}
            <Link to="/companies" style={{ color: '#0a0a0a', fontWeight: 600 }}>Voir les entreprises</Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sharks.map((shark) => (
            <div
              key={shark.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: 0,
                border: '1px solid #e8e8e8',
                background: '#fafafa',
              }}
            >
              <div>
                <Link
                  to={`/companies/${shark.company_id}`}
                  style={{ fontWeight: 600, color: '#0a0a0a', textDecoration: 'none', fontSize: 14 }}
                >
                  {getCompanyName(shark.company_id)}
                </Link>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <StatusBadge status={shark.status} />
                  {shark.contact_method && (
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      via {typeof shark.contact_method === 'string' ? shark.contact_method : (shark.contact_method as { Other: string }).Other}
                    </span>
                  )}
                  {shark.contact_date && (
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      · {formatDate(shark.contact_date)}
                    </span>
                  )}
                </div>
                {shark.notes && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#888', fontStyle: 'italic' }}>
                    "{shark.notes}"
                  </div>
                )}
              </div>
              <Link
                to={`/companies/${shark.company_id}`}
                style={{ color: '#0a0a0a', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
              >
                →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: import('../types').SharkStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 0,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: SHARK_STATUS_COLORS[status] + '22',
        color: SHARK_STATUS_COLORS[status],
        border: `1px solid ${SHARK_STATUS_COLORS[status]}44`,
      }}
    >
      {SHARK_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR');
}

