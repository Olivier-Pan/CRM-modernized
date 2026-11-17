import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';

// --- PALETTES DE COULEURS AMÉLIORÉES ---
const lightTheme = {
  bg: '#f8fafc',
  bgCard: 'rgba(255, 255, 255, 0.85)', // Légèrement transparent pour voir l'effet fluide
  border: '#e2e8f0',
  textTitle: '#0f172a',
  textNormal: '#334155',
  textMuted: '#64748b',
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#ef4444',
  shadow: '0 10px 40px rgba(0,0,0,0.08)',
  blobOpacity: 0.4, // Intensité des couleurs fluides en jour
};

const darkTheme = {
  bg: '#0f172a', 
  bgCard: 'rgba(30, 41, 59, 0.85)', // Ardoise 800 transparent pour contraster avec les inputs
  border: '#334155',
  textTitle: '#ffffff',
  textNormal: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#818cf8',
  primaryHover: '#6366f1',
  inputBg: '#020617', // Très sombre pour un effet creusé
  inputBorder: '#475569', // Bordure beaucoup plus claire pour bien délimiter la case !
  errorBg: 'rgba(239,68,68,0.1)',
  errorBorder: 'rgba(239,68,68,0.2)',
  errorText: '#f87171',
  shadow: '0 20px 40px rgba(0,0,0,0.5)',
  blobOpacity: 0.25, // Intensité des couleurs fluides en nuit
};

export default function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('crm_theme') === 'light' ? false : true;
  });

  useEffect(() => {
    localStorage.setItem('crm_theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? darkTheme.bg : lightTheme.bg;
  }, [isDarkMode]);

  const t = isDarkMode ? darkTheme : lightTheme;

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
        setSuccessMessage('Compte créé avec succès ! Connectez-vous.');
        setIsRegistering(false);
        setPassword('');
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, padding: 16, transition: 'background 0.3s ease', position: 'relative', overflow: 'hidden' }}>
      
      {/* --- STYLES CSS INJECTÉS (Pour les animations et les inputs) --- */}
      <style>{`
        .crm-input {
           outline: none;
           transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .crm-input:focus {
           border-color: #8b5cf6 !important;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
        }
        @keyframes blob-float-1 {
           0% { transform: translate(0, 0) scale(1); }
           33% { transform: translate(40px, -50px) scale(1.1); }
           66% { transform: translate(-20px, 30px) scale(0.9); }
           100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes blob-float-2 {
           0% { transform: translate(0, 0) scale(1); }
           33% { transform: translate(-40px, 50px) scale(0.9); }
           66% { transform: translate(30px, -20px) scale(1.1); }
           100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>

      {/* --- FOND ANIMÉ FLUIDE (Glassmorphism) --- */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {/* Blob Violet */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '60%', background: `radial-gradient(circle, rgba(139, 92, 246, ${t.blobOpacity}) 0%, rgba(139, 92, 246, 0) 70%)`, filter: 'blur(60px)', animation: 'blob-float-1 15s infinite alternate' }} />
        {/* Blob Orange */}
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: `radial-gradient(circle, rgba(249, 115, 22, ${t.blobOpacity}) 0%, rgba(249, 115, 22, 0) 70%)`, filter: 'blur(60px)', animation: 'blob-float-2 20s infinite alternate' }} />
        {/* Blob Bleu */}
        <div style={{ position: 'absolute', top: '30%', left: '30%', width: '50%', height: '50%', background: `radial-gradient(circle, rgba(59, 130, 246, ${t.blobOpacity}) 0%, rgba(59, 130, 246, 0) 70%)`, filter: 'blur(60px)', animation: 'blob-float-1 18s infinite alternate-reverse' }} />
      </div>

      {/* Bouton bascule Jour/Nuit */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        style={{
          position: 'absolute', top: 24, right: 24, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '50%',
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: t.textNormal, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 20,
          backdropFilter: 'blur(10px)'
        }}
        title="Basculer le thème"
      >
        {isDarkMode ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        )}
      </button>

      {/* --- CARTE PRINCIPALE --- */}
      <div style={{
        position: 'relative', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: '44px 44px 40px', width: '100%', maxWidth: 420, boxShadow: t.shadow,
        transition: 'all 0.3s ease', zIndex: 10, backdropFilter: 'blur(20px)' // Effet verre dépoli
      }}>
        
        {/* Bandeau supérieur décoratif */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #8b5cf6, #f97316)'
        }} />

        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <img 
            src="/genius-logo.png" 
            alt="Genius" 
            style={{ 
              height: 70, 
              display: 'inline-block', 
              transition: 'filter 0.3s',
              filter: !isDarkMode ? 'invert(1)' : 'none'
            }} 
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.primary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            {isRegistering ? 'Nouveau membre' : 'Espace CRM'}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: t.textTitle, margin: 0, letterSpacing: '-0.02em' }}>
            {isRegistering ? 'Créer un compte' : 'Connexion'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          
          {isRegistering && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textNormal, marginBottom: 8 }}>Nom complet</label>
              <input
                className="crm-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Prénom Nom"
                style={inputStyle(t)}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textNormal, marginBottom: 8 }}>Adresse Email</label>
            <input
              className="crm-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="prenom.nom@student-cs.fr"
              style={inputStyle(t)}
            />
          </div>

          <div style={{ marginBottom: isRegistering ? 16 : 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textNormal, marginBottom: 8 }}>Mot de passe</label>
            <input
              className="crm-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle(t)}
            />
          </div>

          {/* --- NOUVEAU CHAMP CONDITIONNEL --- */}
          {isRegistering && (
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textNormal, marginBottom: 8 }}>Confirmer le mot de passe</label>
              <input
                className="crm-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle(t)}
              />
            </div>
          )}

          {error && <div style={{ background: t.errorBg, border: `1px solid ${t.errorBorder}`, color: t.errorText, padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</div>}
          {successMessage && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{successMessage}</div>}

          <button 
            type="submit" 
            disabled={loading} 
            style={{
              width: '100%', background: t.primary, color: '#ffffff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = t.primaryHover)}
            onMouseOut={(e) => (e.currentTarget.style.background = t.primary)}
          >
            {loading ? 'Chargement...' : (isRegistering ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccessMessage('');
            }} 
            style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}
            onMouseOver={(e) => (e.currentTarget.style.color = t.textTitle)}
            onMouseOut={(e) => (e.currentTarget.style.color = t.textMuted)}
          >
            {isRegistering ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>

      </div>
    </div>
  );
}

// Design des cases (inputs) grandement éclairci en mode nuit
const inputStyle = (t: typeof lightTheme): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: t.inputBg,
  border: `1px solid ${t.inputBorder}`, // Bordure très visible !
  borderRadius: 8,
  fontSize: 14,
  color: t.textTitle,
  boxSizing: 'border-box',
});