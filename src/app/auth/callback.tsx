import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { setAccessToken } from '../../hooks/auth-client';
import i18n from '../../i18n';
import { supabase } from '../../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleUrl(urlToParse?: string | null) {
      if (!API_BASE_URL) {
        setError('Config missing: API_BASE_URL');
        return;
      }

      // urlToParse comes from the listener; when undefined, try cold start
      const initialUrl = urlToParse ?? (await Linking.getInitialURL());
      const url = initialUrl ?? '';

      console.log("URL DDDD:", url);
      if (!url) {
        setError(url);
        return;
      }

      // attempt to read fragment (#) or query (?) parameters
      let params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken) {
        setError(i18n.t('auth.tokenNotFound'));
        return;
      }

      if (!refreshToken) {
        setError(i18n.t('auth.tokenNotFound'));
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken!,
        });

        if (sessionError) throw new Error(sessionError.message);

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

        // Optional: sign out from supabase SDK if you don't want to keep client-side session
        await supabase.auth.signOut();

        // Go to home
        // router.replace('/');
      } catch (err: any) {
        setError(err?.message ?? i18n.t('auth.loginCancelled'));
      }
    }

    // run once for cold start
    // handleUrl();

    // listen for new incoming deep links (app in background)
    // const subscription = Linking.addEventListener('url', (e) => {
    //   console.log("e.url", e.url);
    //   handleUrl(e.url);
    // });

    // return () => subscription.remove();
    const redirectUrl = Linking.createURL('/auth/callback'); 

    console.log('Redirect URL sendo usada:', redirectUrl);
  }, []);

  return (
    <View style={styles.container}>
      {!error ? (
        <>
          <Text style={styles.text}>Concluindo login…</Text>
          <ActivityIndicator size="large" />
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: 'white', marginBottom: 16 }]}>{error}</Text>
          <Text style={{ color: '#ccc' }}>Redirecionando para tela de login...</Text>
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
    fontSize: 18,
    marginBottom: 12,
  },
});
