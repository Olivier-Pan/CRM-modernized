import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setToken } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: { role: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      if (res.user.role !== 'Admin') {
        throw new Error('Acces reserve aux administrateurs');
      }

      setToken(res.token);
      navigate('/members');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      {/* Grid */}
      <div style={gridBgStyle} />

      {/* Geometric beams SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        {[...Array(14)].map((_, i) => (
          <line key={`b1-${i}`} x1="0" y1="110" x2={10 + i * 8} y2="-10" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`b2-${i}`} x1="110" y1="60" x2={-10 + i * 12} y2="-15" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />
        ))}
      </svg>

      {/* Corner rectangle decorations */}
      <div style={{ position: 'absolute', top: 32, right: 32, width: 100, height: 100, border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 42, right: 42, width: 100, height: 100, border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 32, left: 32, width: 70, height: 70, border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 42, left: 42, width: 70, height: 70, border: '1px solid rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      <div style={cardStyle}>
        {/* Accent top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.08)' }} />

        {/* Logo */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <img src="/genius-logo.png" alt="Genius" style={{ height: 80, display: 'inline-block' }} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#444', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Acces administrateur
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            Panneau Admin
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email admin</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a',
  padding: 16,
  position: 'relative',
  overflow: 'hidden',
};

const gridBgStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  pointerEvents: 'none',
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  background: '#111',
  border: '1px solid #1e1e1e',
  borderRadius: 0,
  padding: '44px 44px 40px',
  width: '100%',
  maxWidth: 400,
  boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: '#555',
  marginBottom: 7,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '11px 14px',
  background: '#0a0a0a',
  border: '1px solid #222',
  borderRadius: 0,
  fontSize: 14,
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.25)',
  color: '#f87171',
  padding: '9px 14px',
  borderRadius: 0,
  fontSize: 13,
  marginBottom: 14,
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  color: '#0a0a0a',
  border: 'none',
  borderRadius: 0,
  padding: '13px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};
