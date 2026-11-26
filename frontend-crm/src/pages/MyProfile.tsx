import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySharks } from '../api/sharks';
import { listCompanies } from '../api/companies';
import { getMe } from '../api/auth';
import { formatRelativeDate } from '../lib/dates';
import type { AuthUser, Company, Shark } from '../types';
import CompanyAvatar from '../components/ui/CompanyAvatar';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import styles from './MyProfile.module.css';

export default function MyProfile() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMe(), getMySharks(), listCompanies()])
      .then(([meData, sharksData, companiesData]) => {
        setMe(meData as AuthUser);
        setSharks(sharksData);
        setCompanies(companiesData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const assignedCompanies = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]));
    const uniqueIds = Array.from(new Set(sharks.map((s) => s.company_id)));
    return uniqueIds
      .map((id) => companyById.get(id))
      .filter((c): c is Company => Boolean(c))
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  }, [sharks, companies]);

  if (loading) {
    return (
      <div className="crm-page" style={{ maxWidth: 920 }}>
        <Spinner label="Chargement du profil…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-page" style={{ maxWidth: 920 }}>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger-text)',
          }}
        >
          <strong>Erreur :</strong> {error}
        </div>
      </div>
    );
  }

  const initials = (me?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <div className="crm-page" style={{ maxWidth: 920 }}>
      <div className={`crm-card ${styles.headerCard}`}>
        <div className={styles.identity}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h1 className={styles.title}>{me?.name || 'Mon profil'}</h1>
            {me && (
              <div className={styles.metaRow}>
                <span>{me.email}</span>
                <span className={styles.roleBadge}>
                  {me.role === 'Admin' ? 'Admin' : 'Membre'}
                </span>
              </div>
            )}
          </div>
        </div>

        <Link to="/companies?owner=me" className="crm-btn crm-btn-secondary crm-btn-sm">
          Voir dans la base &#8599;
        </Link>
      </div>

      <div className="crm-card" style={{ overflow: 'hidden' }}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} tabular-nums`}>
            Mes entreprises attribuées ({assignedCompanies.length})
          </h2>
        </div>

        {assignedCompanies.length === 0 ? (
          <div className={styles.empty}>
            Tu n'es encore assigné à aucune entreprise.{' '}
            <Link to="/companies" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>
              Parcourir les entreprises
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {assignedCompanies.map((company) => (
              <Link key={company.id} to={`/companies/${company.id}`} className={styles.row}>
                <div className={styles.rowLeft}>
                  <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={30} />
                  <div>
                    <div className={styles.companyName}>{company.name}</div>
                    {company.sector && <div className={styles.companyMeta}>{company.sector}</div>}
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <StatusBadge status={company.global_status} />
                  <span className={`${styles.dateLabel} tabular-nums`}>
                    {formatRelativeDate(company.updated_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}