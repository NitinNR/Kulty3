import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { SubscriptionRoute } from './routes/SubscriptionRoute';
import { RoleRoute } from './routes/RoleRoute';
import { useAuth } from './hooks/useAuth';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage';

// Payment
import { PaymentPage } from './pages/payment/PaymentPage';
import { PaymentSuccessPage } from './pages/payment/PaymentSuccessPage';

// User portal
import { CardPage } from './pages/user/CardPage';
import { HomePage } from './pages/user/HomePage';
import { EntryHistoryPage } from './pages/user/EntryHistoryPage';
import { ProfilePage } from './pages/user/ProfilePage';

// Admin portal
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVenuesPage } from './pages/admin/AdminVenuesPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEntriesPage } from './pages/admin/AdminEntriesPage';
import { AdminBillsPage } from './pages/admin/AdminBillsPage';

// Venue owner portal
import { VenueDashboard } from './pages/venue/VenueDashboard';
import { ScannerPage } from './pages/venue/ScannerPage';
import { VenueEntriesPage } from './pages/venue/VenueEntriesPage';
import { VenueBillsPage } from './pages/venue/VenueBillsPage';

import './index.css';

const RootRedirect = () => {
  const { profile, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!profile) return null;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'venue_owner') return <Navigate to="/venue" replace />;
  if (profile.subscription?.status === 'active') return <Navigate to="/home" replace />;
  return <Navigate to="/payment" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Onboarding */}
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />

            {/* User portal */}
            <Route path="/home" element={<ProtectedRoute><SubscriptionRoute><HomePage /></SubscriptionRoute></ProtectedRoute>} />
            <Route path="/card" element={<ProtectedRoute><SubscriptionRoute><CardPage /></SubscriptionRoute></ProtectedRoute>} />
            <Route path="/entries" element={<ProtectedRoute><SubscriptionRoute><EntryHistoryPage /></SubscriptionRoute></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Admin portal */}
            <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminUsersPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/venues" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminVenuesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminEventsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/entries" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminEntriesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/bills" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminBillsPage /></RoleRoute></ProtectedRoute>} />

            {/* Venue owner portal */}
            <Route path="/venue" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><VenueDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/scanner" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><ScannerPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/entries" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><VenueEntriesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/bills" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><VenueBillsPage /></RoleRoute></ProtectedRoute>} />

            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
