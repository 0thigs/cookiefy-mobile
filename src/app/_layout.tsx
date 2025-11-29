import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../hooks/useAuth';

export default function RootLayout() {
  return (
      <AuthProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <StatusBar style="dark" backgroundColor="#fff" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
      </AuthProvider>
  );
}
