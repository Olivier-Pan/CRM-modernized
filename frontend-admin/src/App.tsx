import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Members from './pages/Members';
import Companies from './pages/Companies';
import Editions from './pages/Editions';
import { getToken } from './api/client';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/members" element={<AdminRoute><Members /></AdminRoute>} />
        <Route path="/companies" element={<AdminRoute><Companies /></AdminRoute>} />
        <Route path="/editions" element={<AdminRoute><Editions /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/members" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
