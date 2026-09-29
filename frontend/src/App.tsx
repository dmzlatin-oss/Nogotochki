import { Routes, Route, Navigate } from 'react-router-dom';
import { BookingProvider } from '@/context/BookingContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LandingPage from '@/pages/client/LandingPage';
import BookingPage from '@/pages/client/BookingPage';
import ConfirmationPage from '@/pages/client/ConfirmationPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ClientDashboard from '@/pages/client/ClientDashboard';
import MasterDashboard from '@/pages/master/MasterDashboard';
import AdminDashboard from '@/pages/admin/AdminDashboard';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-stone-50" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGate({ role, children }: { role: 'master' | 'admin' | 'client'; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<RequireAuth><RoleGate role="client"><BookingPage /></RoleGate></RequireAuth>} />
          <Route path="/confirmation" element={<RequireAuth><RoleGate role="client"><ConfirmationPage /></RoleGate></RequireAuth>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/client" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
          <Route path="/master" element={<RequireAuth><RoleGate role="master"><MasterDashboard /></RoleGate></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><RoleGate role="admin"><AdminDashboard /></RoleGate></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BookingProvider>
    </AuthProvider>
  );
}

export default App;
