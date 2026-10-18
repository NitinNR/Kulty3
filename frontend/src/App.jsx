import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { useAuth } from './hooks/useAuth';
import { useMsg91Captcha } from './hooks/useMsg91Captcha';
import { useAppSettings } from './hooks/useAppSettings';
import {
  initMsg91Widget,
  isMsg91Configured,
  isCaptchaVerified,
  resetMsg91Captcha,
  MSG91_CAPTCHA_RENDER_ID,
  MSG91_CAPTCHA_ANCHOR_ID,
} from './services/msg91';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage';
import { PartnerLoginPage } from './pages/auth/PartnerLoginPage';
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
import { AdminCitiesPage } from './pages/admin/AdminCitiesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

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
  if (profile.intentRole === 'venue_owner') return <Navigate to="/apply-venue" replace />;
  return <Navigate to="/home" replace />;
};

// Persistent host for MSG91's captcha. It must live at the app root (not inside
// a route) so it exists before the widget initializes and never unmounts.
//
// MSG91 appends its captcha here once and never re-renders it, so we reset it
// ourselves whenever it becomes needed again (e.g. after logout) to get a fresh
// challenge. While it's needed we physically move this node into the login
// form's anchor (right above the "Send OTP" button); otherwise it sits in an
// off-screen fallback. Moving the node — instead of placing it inside a route —
// keeps MSG91's one-time binding intact. It's hidden once the user has verified
// it, and on the OTP step (resends don't need a captcha).
const Msg91CaptchaHost = () => {
  const { pathname } = useLocation();
  const { verified, step } = useMsg91Captcha();
  const { loaded: settingsLoaded, authMethods } = useAppSettings();
  const fallbackRef = useRef(null);
  const hostRef = useRef(null);
  const wasVisibleRef = useRef(false);

  // The captcha only matters for phone (OTP) sign-in, so it never shows when the
  // admin has turned phone auth off. Wait for settings to load so it can't flash
  // on a Google-only login screen. Both the member (/login) and partner
  // (/partner) auth screens can use phone sign-in.
  const onPhoneAuthScreen = pathname === '/login' || pathname === '/partner';
  const shouldShow =
    settingsLoaded && authMethods.phone && onPhoneAuthScreen && step === 'method' && !verified;

  useEffect(() => {
    const host = hostRef.current;
    const fallback = fallbackRef.current;
    if (!host || !fallback) return;

    // Prefer the login form's inline anchor (above "Send OTP"); fall back to the
    // off-screen holder when the anchor isn't on screen.
    const anchor = shouldShow ? document.getElementById(MSG91_CAPTCHA_ANCHOR_ID) : null;
    const target = anchor || fallback;
    if (host.parentElement !== target) target.appendChild(host);

    // Reset only when the captcha transitions into "needed" and isn't already
    // solved, so we don't wipe a challenge the user is mid-way through.
    if (shouldShow && !wasVisibleRef.current && !isCaptchaVerified()) {
      resetMsg91Captcha();
    }
    wasVisibleRef.current = shouldShow;
  }, [shouldShow, pathname, step]);

  return (
    <div
      ref={fallbackRef}
      style={{ position: 'fixed', left: '-10000px', top: 0, zIndex: 60 }}
    >
      {/* The node always stays mounted (the widget's captcha instance must not
          be destroyed); only its position in the tree changes. */}
      <div ref={hostRef} id={MSG91_CAPTCHA_RENDER_ID} />
    </div>
  );
};

export default function App() {
  const { loaded: settingsLoaded, authMethods } = useAppSettings();

  // Initialize the MSG91 OTP widget once for the whole page session. It's kept
  // at the app level (not inside LoginPage) so logging in/out never tears it
  // down or re-initializes it — re-initializing would break the widget because
  // MSG91 binds window.sendOtp to the first instance only (see services/msg91).
  // Skipped entirely while phone sign-in is disabled so we don't load the widget
  // (or render its captcha) on a Google-only setup.
  useEffect(() => {
    if (isMsg91Configured() && settingsLoaded && authMethods.phone) {
      initMsg91Widget({ captchaRenderId: MSG91_CAPTCHA_RENDER_ID }).catch((err) =>
        console.error('MSG91 widget init failed:', err)
      );
    }
  }, [settingsLoaded, authMethods.phone]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AnimatedRoutes />
          <Msg91CaptchaHost />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [pathname]);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const isDetail = /^\/venues\/[^/]+$/.test(location.pathname) || /^\/events\/[^/]+$/.test(location.pathname);
  return (
    <>
      <ScrollToTop />
      <div key={location.pathname} className={isDetail ? 'page-transition page-transition--detail' : 'page-transition'}>
        <Routes location={location}>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/partner" element={<PartnerLoginPage />} />

            {/* Onboarding */}
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
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
            <Route path="/admin/cities" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminCitiesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminSettingsPage /></RoleRoute></ProtectedRoute>} />

            {/* Venue owner portal — dashboard/scanner/entries/bills allow staff too */}
            <Route path="/venue" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueDashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/scanner" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><ScannerPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/entries" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueEntriesPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/bills" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner', 'venue_staff']}><VenueBillsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/venue/settings" element={<ProtectedRoute><RoleRoute allowedRoles={['venue_owner']}><VenueSettingsPage /></RoleRoute></ProtectedRoute>} />

            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirect />} />
        </Routes>
      </div>
    </>
  );
};
