// src/context/AuthContext.tsx — токен, пользователь, роли.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken } from '@/api/client';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'client' | 'master' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isClient: boolean;
  isMaster: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const u = await api.login({ email, password });
    setUser(u);
    return u;
  };
  const register = async (name: string, email: string, password: string) => {
    await api.register({ name, email, password });
    const u = await api.login({ email, password });
    setUser(u);
  };
  const logout = () => {
    api.logout();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isClient: user?.role === 'client',
      isMaster: user?.role === 'master',
      isAdmin: user?.role === 'admin',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
