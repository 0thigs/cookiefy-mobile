import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useNavigation() {
  const router = useRouter();

  const handleTabPress = useCallback((tabId: string) => {
    switch (tabId) {
      case 'home':
        router.push('/');
        break;
      case 'search':
        router.push('/search');
        break;
      case 'shoppingList':
        router.push('/shopping-list');
        break;
      case 'favorites':
        router.push('/favorites');
        break;
      case 'profile':
        router.push('/profile');
        break;
      default:
        console.warn(`Tab não reconhecido: ${tabId}`);
    }
  }, [router]);

  return {
    handleTabPress,
  };
}
