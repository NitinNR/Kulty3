import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { useAuth } from './hooks/useAuth';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage';
import { ChoosePathPage } from './pages/auth/ChoosePathPage';
import { ApplyVenueOwnerPage } from './pages/auth/ApplyVenueOwnerPage';

// Payment
import { PaymentPage } from './pages/payment/PaymentPage';
import { PaymentSuccessPage } from './pages/payment/PaymentSuccessPage';

// User portal
import { CardPage } from './pages/user/CardPage';
import { HomePage } from './pages/user/HomePage';
import { VenueDetailPage } from './pages/user/VenueDetailPage';
import { EntryHistoryPage } from './pages/user/EntryHistoryPage';
import { EventsPage } from './pages/user/EventsPage';
import { EventDetailPage } from './pages/user/EventDetailPage';
import { ProfilePage } from './pages/user/ProfilePage';
import { FavoritesPage } from './pages/user/FavoritesPage';

// Admin portal
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVenuesPage } from './pages/admin/AdminVenuesPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEntriesPage } from './pages/admin/AdminEntriesPage';
import { AdminBillsPage } from './pages/admin/AdminBillsPage';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';

// Venue owner portal
import { VenueDashboard } from './pages/venue/VenueDashboard';
import { ScannerPage } from './pages/venue/ScannerPage';
import { VenueEntriesPage } from './pages/venue/VenueEntriesPage';
import { VenueBillsPage } from './pages/venue/VenueBillsPage';
import { VenueSettingsPage } from './pages/venue/VenueSettingsPage';

import './index.css';

const RootRedirect = () => {
  const { profile, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!profile) return null;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'venue_owner' || profile.role === 'venue_staff') return <Navigate to="/venue" replace />;
  if (!profile.name) return <Navigate to="/complete-profile" replace />;
  if (!profile.intentRole) return <Navigate to="/choose-path" replace />;
  if (profile.intentRole === 'venue_owner') return <Navigate to="/apply-venue" replace />;
  return <Navigate to="/home" replace />;
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
            <Route path="/choose-path" element={<ProtectedRoute><ChoosePathPage /></ProtectedRoute>} />
            <Route path="/apply-venue" element={<ProtectedRoute><ApplyVenueOwnerPage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />

            {/* User portal — no subscription gate, users can explore freely */}
            <Route path="/home"        element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/venues/:id"  element={<ProtectedRoute><VenueDetailPage /></ProtectedRoute>} />
            <Route path="/events"      element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/events/:id"  element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
            <Route path="/card"        element={<ProtectedRoute><CardPage /></ProtectedRoute>} />
            <Route path="/entries"     element={<ProtectedRoute><EntryHistoryPage /></ProtectedRoute>} />
            <Route path="/profile"     element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/favorites"   element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />

            {/* Admin portal */}
            <Route path="/admin" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminUsersPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/venues" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminVenuesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminEventsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/entries" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminEntriesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/bills" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminBillsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/applications" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminApplicationsPage /></RoleRoute></ProtectedRoute>} />

            {/* Venue owner portal — dashboard/scanner/entries/bills allow staff too */}
            <Route path="/venue" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/scanner" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><ScannerPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/entries" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueEntriesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/bills" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueBillsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/settings" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><VenueSettingsPage /></RoleRoute></ProtectedRoute>} />

            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
