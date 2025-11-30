import { router } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { Me } from './auth-client';
import {
  fetchMe as apiFetchMe,
  signIn as apiSignIn,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  signUp as apiSignUp,
  onSessionExpired
} from './auth-client';

type AuthContextType = {
  me: Me;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSessionExpired(() => {
      setMe(null);
      router.replace('/(auth)/welcome');
    });
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      let user = null;
      try {
        user = await apiFetchMe();
        setMe(user);
      } finally {
        setLoading(false);
        if (!user) router.replace('/(auth)/welcome');
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
    // console.log('user', user);
    setMe(user);
    router.replace('/');
  }

  async function signInWithGoogle() {
    await apiSignInWithGoogle();
    const user = await apiFetchMe();
    console.log('user', user);
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
    <AuthContext.Provider value={{ me, loading, signIn, signUp, signInWithGoogle, signOut, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
