import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function AuthLayout() {
  const { me, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && me) router.replace('/');
  }, [loading, me, router]);

  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerTitleAlign: 'center' }} />
  );
}
