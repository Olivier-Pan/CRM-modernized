import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import MyProfile from './pages/MyProfile';
import Dashboard from './pages/Dashboard';
import MyCompanies from './pages/MyCompanies';
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
        Vérification des accès...
      </div>
    );
  }

  // Ton système utilise "role: 'Admin'" (comme vu dans TeamManagement.tsx)
  const isAdmin = me?.role === 'Admin';

  // 3. Bouclier de sécurité : On rejette les non-admins qui tentent d'accéder à /team
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. On passe isAdmin et userName à ton Layout pour afficher/cacher le bouton
  return (
    <Layout userName={me?.name} isAdmin={isAdmin}>
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
        <Route
          path="/my-companies"
          element={
            <PrivateLayout>
              <MyCompanies />
            </PrivateLayout>
          }
        />
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