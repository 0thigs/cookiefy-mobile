import { StatusBar } from 'expo-status-bar';

import './global.css';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import WelcomeScreen from '@/components/WelcomeScreen';

export default function App() {
  return (
    <GluestackUIProvider mode="light">
      <WelcomeScreen />
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
