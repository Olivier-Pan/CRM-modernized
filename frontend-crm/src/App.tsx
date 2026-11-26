import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import MyProfile from './pages/MyProfile';
import Dashboard from './pages/Dashboard';
import TeamManagement from './pages/TeamManagement'; // <-- Le bon nom du composant
import { getMe } from './api/auth'; // <-- Pour récupérer l'utilisateur
import type { AuthUser } from './types'; // <-- Pour le typage


// Amélioration de PrivateLayout : il gère maintenant les permissions et transmet les infos au Layout
function PrivateLayout({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const token = localStorage.getItem('genius_token');
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((data) => setMe(data as AuthUser))
        .catch(() => {
          // Si le token est invalide ou expiré, on nettoie
          localStorage.removeItem('genius_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // 1. Redirection si non connecté
  if (!token) return <Navigate to="/login" replace />;
  
  // 2. Écran d'attente pendant la vérification de l'utilisateur
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'var(--bg-canvas)',
          color: 'var(--text-secondary)',
          fontSize: 13.5,
        }}
      >
        <div
          style={{
            width: 15,
            height: 15,
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'crmSpin 0.75s linear infinite',
          }}
        />
        Vérification des accès…
      </div>
    );
  }

  const isAdmin = me?.role === 'Admin';

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout userName={me?.name} userId={me?.id} isAdmin={isAdmin}>
      {children}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/dashboard"
          element={
            <PrivateLayout>
              <Dashboard />
            </PrivateLayout>
          }
        />
        <Route
          path="/companies"
          element={
            <PrivateLayout>
              <Companies />
            </PrivateLayout>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <PrivateLayout>
              <CompanyDetail />
            </PrivateLayout>
          }
        />
        <Route path="/my-companies" element={<Navigate to="/companies?owner=me" replace />} />
        <Route
          path="/profile"
          element={
            <PrivateLayout>
              <MyProfile />
            </PrivateLayout>
          }
        />
        
        {/* NOUVELLE ROUTE SÉCURISÉE : on active le bouclier requireAdmin={true} */}
        <Route 
          path="/team" 
          element={
            <PrivateLayout requireAdmin={true}>
              <TeamManagement />
            </PrivateLayout>
          } 
        />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}