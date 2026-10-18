import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthChange, logout as firebaseLogout } from '../services/firebase';
import { getMe } from '../services/api';

export const AuthContext = createContext();

// The backend returns a fresh plain object on every GET /users/me. Replacing
// `profile` with an identical (but new) object re-identifies it, which makes any
// `useEffect(..., [profile])` restart — that was feeding an infinite
// getMe/getMyPayments loop from the payment page's settle-guard poll. Only
// commit a new state value when the data actually changed.
const profileChanged = (prev, next) => {
  if (prev === next) return false;
  if (!prev || !next) return true;
  try {
    return JSON.stringify(prev) !== JSON.stringify(next);
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (firebaseUser) => {
    try {
      // Force fresh token before calling backend
      await firebaseUser.getIdToken(true);
      const profileRes = await getMe();
      setProfile((prev) => (profileChanged(prev, profileRes.data) ? profileRes.data : prev));
      return profileRes.data;
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  // Returns the fresh profile so callers can assert on it (e.g. waiting for a
  // webhook to activate a membership). Existing callers ignore the value.
  // Stable identity (only changes when the signed-in user changes) so it is
  // safe to list in effect deps.
  const refreshProfile = useCallback(async () => {
    if (user) return await fetchProfile(user);
    return null;
  }, [user, fetchProfile]);

  const logout = useCallback(async () => {
    await firebaseLogout();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    refreshProfile,
    logout,
  }), [user, profile, loading, refreshProfile, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
