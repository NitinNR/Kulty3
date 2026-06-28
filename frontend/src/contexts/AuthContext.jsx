import { createContext, useEffect, useState } from 'react';
import { onAuthChange, logout as firebaseLogout } from '../services/firebase';
import { getMe } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser) => {
    try {
      // Force fresh token before calling backend
      await firebaseUser.getIdToken(true);
      const profileRes = await getMe();
      setProfile(profileRes.data);
      return profileRes.data;
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
      setProfile(null);
      return null;
    }
  };

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
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const logout = async () => {
    await firebaseLogout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      refreshProfile,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
