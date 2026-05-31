import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'crewsync_driver_token';
const USER_KEY  = 'crewsync_driver_user';

interface AuthUser {
  userId: string;
  email: string;
  vehicleId?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  ready: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null, user: null,
  login: async () => {}, logout: async () => {}, ready: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user,  setUser]  = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
      setReady(true);
    })();
  }, []);

  const login = async (t: string, u: AuthUser) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, t),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)),
    ]);
    setToken(t); setUser(u);
  };

  const logout = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
