import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Registration from './pages/Registration';
import Contact from './pages/Contact';
import { getToken } from './api/client';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Public : une entreprise pas encore contactee peut se manifester. */}
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
