'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthState {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ token: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('crewsync_token'));
  }, []);

  const login = (t: string) => {
    localStorage.setItem('crewsync_token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('crewsync_token');
    setToken(null);
  };

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
