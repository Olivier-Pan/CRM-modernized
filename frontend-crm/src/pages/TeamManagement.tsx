import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMembers, updateMemberRole, resetMemberPassword } from '../api/members';
import { listSharks } from '../api/sharks';
import { getMe } from '../api/auth';
import type { AuthUser, Member, Shark } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';
import { IconSearch } from '../components/ui/Icons';
import Spinner from '../components/ui/Spinner';
import MemberActionsMenu from '../components/team/MemberActionsMenu';
import ResetPasswordModal from '../components/team/ResetPasswordModal';
import styles from './TeamManagement.module.css';

type RoleFilter = 'all' | 'Admin' | 'Member';

export default function TeamManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sharks, setSharks] = useState<Shark[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [notice, setNotice] = useState('');

  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([getMe(), getMembers(), listSharks().catch(() => [] as Shark[])])
      .then(([meData, membersData, sharksData]) => {
        setCurrentUser(meData);
        setMembers(membersData);
        setSharks(sharksData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur lors du chargement de l'équipe"))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = currentUser?.role === 'Admin';

  const companyCountByMember = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sharks) {
      const set = map.get(s.member_id) || new Set<string>();
      set.add(s.company_id);
      map.set(s.member_id, set);
    }
    return map;
  }, [sharks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [members, query, roleFilter]);

  const adminCount = useMemo(() => members.filter((m) => m.role === 'Admin').length, [members]);

  async function confirmRoleChange() {
    if (!roleTarget || !isAdmin) return;
    const nextRole = roleTarget.role === 'Admin' ? 'Member' : 'Admin';
    setActionLoading(true);
    try {
      await updateMemberRole(roleTarget.id, nextRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === roleTarget.id ? { ...m, role: nextRole } : m))
      );
      setNotice(`${roleTarget.name} est désormais ${nextRole === 'Admin' ? 'Admin' : 'Membre'}.`);
      setRoleTarget(null);
    } catch {
      alert('Erreur lors de la mise à jour du rôle.');
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmPasswordReset(newPassword: string) {
    if (!pwdTarget || !isAdmin) return;
    setActionLoading(true);
    try {
      await resetMemberPassword(pwdTarget.id, newPassword);
      setNotice(`Mot de passe de ${pwdTarget.name} réinitialisé.`);
      setPwdTarget(null);
    } catch {
      alert('Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="crm-page">
        <Spinner label="Chargement de l'équipe…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-page">
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

  return (
    <div className="crm-page">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion de l'équipe</h1>
          <p className={`${styles.subtitle} tabular-nums`}>
            {members.length} membre{members.length > 1 ? 's' : ''} · {adminCount} admin
            {adminCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {notice && <div className={styles.notice}>{notice}</div>}

      <div className={`crm-card ${styles.toolbar}`}>
        <div className={styles.searchWrap}>
          <IconSearch size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            className={`crm-input ${styles.searchInput}`}
            placeholder="Rechercher un membre par nom ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Filtrer par rôle">
          {(
            [
              { id: 'all', label: `Tous (${members.length})` },
              { id: 'Admin', label: `Admins (${adminCount})` },
              { id: 'Member', label: `Membres (${members.length - adminCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`${styles.tab} ${roleFilter === tab.id ? styles.tabActive : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="crm-card" style={{ overflow: 'hidden' }}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Membre</th>
                <th className={styles.th} style={{ width: 120 }}>Rôle</th>
                <th className={`${styles.th} ${styles.thRight}`} style={{ width: 170 }}>
                  Entreprises suivies
                </th>
                {isAdmin && <th className={`${styles.th} ${styles.thRight}`} style={{ width: 72 }} />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className={styles.emptyCell}>
                    Aucun membre ne correspond à cette recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  const count = companyCountByMember.get(member.id)?.size || 0;
                  return (
                    <tr key={member.id} className={styles.row}>
                      <td className={styles.td}>
                        <div className={styles.memberCell}>
                          <span className={`${styles.avatar} ${member.role === 'Admin' ? styles.avatarAdmin : ''}`}>
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className={styles.memberName}>
                              {member.name}
                              {isSelf && <span className={styles.selfTag}>(Vous)</span>}
                            </div>
                            <div className={styles.memberEmail}>{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className={styles.td}>
                        <span className={`${styles.roleBadge} ${member.role === 'Admin' ? styles.roleBadgeAdmin : ''}`}>
                          {member.role === 'Admin' ? 'Admin' : 'Membre'}
                        </span>
                      </td>

                      <td className={`${styles.td} ${styles.tdRight} tabular-nums`}>
                        {count > 0 ? (
                          <Link
                            to={`/companies?owner=${member.id}`}
                            style={{ color: 'var(--accent-text)', fontWeight: 500 }}
                          >
                            {count} entreprise{count > 1 ? 's' : ''} &#8599;
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>0</span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className={`${styles.td} ${styles.tdRight}`}>
                          <MemberActionsMenu
                            member={member}
                            isSelf={isSelf}
                            onRequestRoleToggle={setRoleTarget}
                            onRequestPasswordReset={setPwdTarget}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={roleTarget !== null}
        title={roleTarget?.role === 'Admin' ? 'Rétrograder en Membre' : 'Nommer Admin'}
        message={
          roleTarget
            ? `Confirmer le changement de rôle de ${roleTarget.name} vers « ${
                roleTarget.role === 'Admin' ? 'Membre' : 'Admin'
              } » ?`
            : ''
        }
        confirmLabel="Confirmer"
        loading={actionLoading}
        onCancel={() => setRoleTarget(null)}
        onConfirm={confirmRoleChange}
      />

      <ResetPasswordModal
        member={pwdTarget}
        loading={actionLoading}
        onClose={() => setPwdTarget(null)}
        onConfirm={confirmPasswordReset}
      />
    </div>
  );
}