import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthProvider } from '~/hooks/useAuth';

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <AuthProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
