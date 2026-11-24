import React, { useState } from 'react';
import { loginExhibitor } from '../api/exhibitor';

export const Login: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !password) {
      setError("Veuillez renseigner le nom de votre entreprise et votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      await loginExhibitor(companyName.trim(), password);
      window.location.href = '/';
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Identifiants incorrects. Vérifiez le nom de votre entreprise ou le mot de passe reçu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__eyebrow">Genius CentraleSupélec · NovaTech</div>
          <h1>Portail Exposant</h1>
          <p className="login-card__subtitle">
            Connectez-vous pour compléter votre fiche brochure et vos besoins logistiques.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert--error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="field-group">
            <label className="field-label" htmlFor="company_name">
              Nom de l'entreprise
            </label>
            <input
              id="company_name"
              type="text"
              className="input"
              placeholder="Ex. Votre entreprise"
              autoComplete="username"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
          </button>
        </form>

        <div className="login-card__footer">
          <span>Un problème d'accès ?</span>
          <a href="mailto:contact@genius-cs.fr" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            contact@genius-cs.fr
          </a>
        </div>
      </div>
    </main>
  );
};