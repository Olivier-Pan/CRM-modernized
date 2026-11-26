import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useTheme, toggleTheme } from '../hooks/useTheme';

export default function Login() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
          setLoading(false);
          return;
        }
        await register(name, email, password);
        setSuccessMessage('Compte créé avec succès. Connecte-toi pour accéder au CRM.');
        setIsRegistering(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        padding: 20,
        position: 'relative',
      }}
    >
      {/* Bascule clair / sombre */}
      <button
        type="button"
        onClick={toggleTheme}
        className="crm-icon-btn"
        title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 34,
          height: 34,
          background: 'var(--bg-surface)',
        }}
      >
        {theme === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Carte principale */}
      <div
        className="crm-card"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '32px 28px 28px',
        }}
      >
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <img
            src="/genius-logo.png"
            alt="Genius CentraleSupélec"
            style={{
              height: 44,
              width: 'auto',
              display: 'block',
              filter: 'var(--logo-filter)',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
              }}
            >
              {isRegistering ? 'Créer un compte membre' : 'Connexion au CRM'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
              {isRegistering
                ? 'Accès réservé aux membres Genius CentraleSupélec'
                : 'Entre tes identifiants pour accéder à la prospection'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegistering && (
            <div>
              <label style={labelStyle} htmlFor="login-name">
                Nom complet
              </label>
              <input
                id="login-name"
                className="crm-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Prénom Nom"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label style={labelStyle} htmlFor="login-email">
              Adresse email
            </label>
            <input
              id="login-email"
              className="crm-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="prenom.nom@student-cs.fr"
              autoComplete="email"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className="crm-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegistering && (
            <div>
              <label style={labelStyle} htmlFor="login-confirm">
                Confirmer le mot de passe
              </label>
              <input
                id="login-confirm"
                className="crm-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                background: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger-text)',
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                background: 'var(--status-success-bg)',
                border: '1px solid var(--status-success-border)',
                color: 'var(--status-success-text)',
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="crm-btn crm-btn-primary"
            style={{ width: '100%', height: 38, marginTop: 4 }}
          >
            {loading ? 'Chargement…' : isRegistering ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegistering((v) => !v);
              setError('');
              setSuccessMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {isRegistering ? (
              <>
                Déjà un compte ? <span style={{ color: 'var(--accent-text)' }}>Se connecter</span>
              </>
            ) : (
              <>
                Pas encore de compte ? <span style={{ color: 'var(--accent-text)' }}>S'inscrire</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 5,
};