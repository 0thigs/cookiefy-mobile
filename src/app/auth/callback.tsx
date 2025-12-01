import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccessToken, setAccessToken } from '../../hooks/auth-client';
import { useAuth } from '../../hooks/useAuth';
import i18n from '../../i18n';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://cookiefy-server.onrender.com';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const localParams = useLocalSearchParams();

  useEffect(() => {
    let isMounted = true;

    // Polling mechanism to check if token was set by auth-client.ts
    const checkTokenInterval = setInterval(async () => {
        const token = await getAccessToken();
        if (token) {
            if (isMounted) setDebugInfo('Token found via polling! Redirecting...');
            await refreshMe();
            if (isMounted) router.replace('/');
            clearInterval(checkTokenInterval);
        }
    }, 1000);

    async function handleUrl(urlToParse: string) {
      if (!isMounted) return;
      setDebugInfo(prev => `Processing URL: ${urlToParse}\n${prev}`);
      
      if (!API_BASE_URL) {
        setError('Config missing: API_BASE_URL');
        return;
      }

      // Check if we are already logged in
      const currentToken = await getAccessToken();
      if (currentToken) {
        setDebugInfo('Already logged in, redirecting...');
        await refreshMe();
        router.replace('/');
        return;
      }

      // attempt to read fragment (#) or query (?) parameters
      let params = new URLSearchParams(urlToParse.split('#')[1] ?? urlToParse.split('?')[1]);
      let accessToken = params.get('access_token');
      let refreshToken = params.get('refresh_token');

      if (!accessToken) {
        // Try to see if it's a simple query param (no hash)
        const queryParams = new URLSearchParams(urlToParse.split('?')[1]);
        if (queryParams.get('access_token')) {
             params = queryParams;
             accessToken = params.get('access_token');
             refreshToken = params.get('refresh_token');
        }
      }

      // Fallback: check localParams from router
      if (!accessToken && localParams?.access_token) {
          accessToken = localParams.access_token as string;
          refreshToken = localParams.refresh_token as string;
          setDebugInfo(prev => prev + '\nFound token in localParams');
      }

      if (!accessToken || !refreshToken) {
         // Don't error immediately if we are just waiting for the event
         if (urlToParse === 'initial_check') {
             return; 
         }
         // Only show error if we actually parsed a URL and failed to find token
         if (urlToParse !== 'router_params') {
             setError(i18n.t('auth.tokenNotFound'));
             setDebugInfo(prev => prev + '\nToken not found in URL');
         }
         return;
      }

      try {
        setDebugInfo(prev => prev + '\nSetting Supabase session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw new Error(sessionError.message);

        setDebugInfo(prev => prev + '\nExchanging token with server...');
        const res = await fetch(`${API_BASE_URL}/auth/exchange/supabase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: sessionData.session?.access_token }),
        });

        if (!res.ok) {
          await supabase.auth.signOut();
          const msg = await res.json().catch(() => ({}));
          throw new Error(msg?.message ?? i18n.t('auth.tokenExchangeError'));
        }

        const serverData = (await res.json()) as { token: string; expiresIn: string | number };

        if (!serverData.token) throw new Error(i18n.t('auth.serverTokenMissing'));

        await setAccessToken(serverData.token);
        await supabase.auth.signOut();
        await refreshMe();

        if (isMounted) router.replace('/');
      } catch (err: any) {
        // Check if we have a token now (race condition check)
        const token = await getAccessToken();
        if (token) {
             await refreshMe();
             if (isMounted) router.replace('/');
             return;
        }

        console.error("Auth Callback Error:", err);
        if (isMounted) {
            setError(err?.message ?? i18n.t('auth.loginCancelled'));
            setDebugInfo(prev => prev + `\nError: ${err?.message}`);
        }
      }
    }

    // 1. Check if we have params from Router immediately
    if (localParams?.access_token) {
        handleUrl('router_params'); 
    } else {
        // 2. Manual URL handling
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleUrl(url);
            } else {
                setDebugInfo('Initial URL is null. Waiting for event...');
            }
        });
    }

    const sub = Linking.addEventListener('url', (e) => {
        handleUrl(e.url);
    });

    return () => {
        isMounted = false;
        sub.remove();
        clearInterval(checkTokenInterval);
    };
  }, [localParams]);

  return (
    <View style={styles.container}>
      {!error ? (
        <>
          <Text style={styles.text}>Concluindo login…</Text>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={[styles.debugText, { marginTop: 20 }]}>{debugInfo}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: '#ff4444', marginBottom: 16, fontWeight: 'bold' }]}>Erro ao logar</Text>
          <Text style={[styles.text, { marginBottom: 20 }]}>{error}</Text>
          
          <Pressable 
            style={styles.button} 
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.buttonText}>Voltar para Login</Text>
          </Pressable>

          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 16,
  },
  text: {
    color: 'white',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  debugText: {
    color: '#888',
    fontSize: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
