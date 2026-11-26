import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getExhibitorToken } from './api/exhibitor';
import { Login } from './pages/Login';
import { Registration } from './pages/Registration';
import Contact from './pages/Contact';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getExhibitorToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Public : une entreprise pas encore contactée peut se manifester */}
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/registration"
          element={
            <PrivateRoute>
              <Registration />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/registration" replace />} />
      </Routes>
    </BrowserRouter>
  );
}