import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { Member } from '../types';

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Member' | 'Admin'>('Member');
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'Member' | 'Admin'>('Member');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiFetch<Member[]>('/members');
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await apiFetch<Member>('/members', {
        method: 'POST',
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      });
      setShowCreate(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('Member');
      loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(m: Member) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditRole(m.role);
    setEditPassword('');
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      await apiFetch<Member>(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      setEditingId(null);
      loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le membre "${name}" ?`)) return;
    try {
      await apiFetch(`/members/${id}`, { method: 'DELETE' });
      loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Chargement…</div>;
  if (error) return <div style={{ padding: 40, color: '#f87171' }}>Erreur : {error}</div>;

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 4, letterSpacing: '-0.02em' }}>Membres Genius</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{members.length} membre{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>+ Nouveau membre</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>Créer un membre</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input placeholder="Nom" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            <input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'Member' | 'Admin')} style={inputStyle}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={creating} style={btnPrimaryStyle}>{creating ? 'Création…' : 'Créer'}</button>
            <button onClick={() => setShowCreate(false)} style={btnSecondaryStyle}>Annuler</button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rôle</th>
              <th style={thStyle}>Créé le</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                {editingId === m.id ? (
                  <>
                    <td style={tdStyle}><input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} /></td>
                    <td style={tdStyle}><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={inputStyle} /></td>
                    <td style={tdStyle}>
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'Member' | 'Admin')} style={inputStyle}>
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td style={tdStyle}><input placeholder="Nouveau mdp (optionnel)" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} style={inputStyle} /></td>
                    <td style={tdStyle}>
                      <button onClick={() => handleSaveEdit(m.id)} disabled={saving} style={{ ...btnPrimaryStyle, marginRight: 6, fontSize: 12 }}>Sauver</button>
                      <button onClick={() => setEditingId(null)} style={{ ...btnSecondaryStyle, fontSize: 12 }}>Annuler</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={tdStyle}><span style={{ fontWeight: 600, color: '#0a0a0a' }}>{m.name}</span></td>
                    <td style={{ ...tdStyle, color: '#555' }}>{m.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: m.role === 'Admin' ? '#0a0a0a' : '#f5f5f5',
                        color: m.role === 'Admin' ? '#fff' : '#555',
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#aaa' }}>{formatDate(m.created_at)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => startEdit(m)} style={{ ...btnSecondaryStyle, marginRight: 6, fontSize: 12 }}>Modifier</button>
                      <button onClick={() => handleDelete(m.id, m.name)} style={{ ...btnDangerStyle, fontSize: 12 }}>Supprimer</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

const thStyle: React.CSSProperties = { padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#888', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: '#0a0a0a' };
const btnPrimaryStyle: React.CSSProperties = { background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const btnSecondaryStyle: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const btnDangerStyle: React.CSSProperties = { background: '#fff', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
