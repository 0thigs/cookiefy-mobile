import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { me, signOut } = useAuth();

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="mb-2 text-2xl font-bold">Cookiefy</Text>
      <Text className="mb-6">{me ? `Olá, ${me.name}` : 'Visitante'}</Text>

      <Pressable className="px-4 py-2 rounded bg-primary" onPress={signOut}>
        <Text className="font-semibold text-white">Sair</Text>
      </Pressable>
    </View>
  );
}
