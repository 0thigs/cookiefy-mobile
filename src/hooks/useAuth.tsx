import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import type { Me } from './auth-client';
import { fetchMe as apiFetchMe, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut } from './auth-client';

SplashScreen.preventAutoHideAsync().catch(() => { });

type AuthContextType = {
  me: Me;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await apiFetchMe();
        setMe(user);
      } finally {
        setLoading(false);
        SplashScreen.hideAsync().catch(() => { });
        if (!me) router.replace('/(auth)/welcome');
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    await apiSignIn(email, password);
    const user = await apiFetchMe();
    setMe(user);
    router.replace('/');
  }

  async function signUp(name: string, email: string, password: string) {
    await apiSignUp(name, email, password);
    const user = await apiFetchMe();
    setMe(user);
    router.replace('/');
  }

  async function signOut() {
    await apiSignOut();
    setMe(null);
    router.replace('/(auth)/welcome');
  }

  async function refreshMe() {
    const user = await apiFetchMe();
    setMe(user);
  }

  return (
    <AuthContext.Provider value={{ me, loading, signIn, signUp, signOut, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
