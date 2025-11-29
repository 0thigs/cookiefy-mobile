import { router } from 'expo-router';
import { Image, Linking, Pressable, Text, View } from 'react-native';

export default function Welcome() {
  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <View className="items-center mb-12">
        <Image
          source={require('../../../assets/images/logo.png')}
          style={{ width: 120, height: 120 }}
        />
      </View>

      <Text className="mb-2 text-3xl font-bold text-center">Bem-vindo ao Cookiefy</Text>
      <Text className="mb-8 text-center text-gray-500">
        Descubra receitas incríveis, organize seus favoritos e cozinhe com facilidade
      </Text>

      <Pressable
        onPress={() => router.push('/(auth)/sign-in')}
        className="items-center py-3 mb-3 rounded-lg bg-primary">
        <Text className="font-semibold text-white">Entrar</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(auth)/sign-up')}
        className="items-center py-3 rounded-lg border border-gray-300">
        <Text className="font-semibold text-gray-700">Criar conta</Text>
      </Pressable>

      <Text className="mt-8 text-xs text-center text-gray-400">
        Ao continuar, você concorda com nossos{' '}
        <Text className="text-primary" onPress={() => Linking.openURL('https://example.com/terms')}>
          Termos de Uso
        </Text>{' '}
        e{' '}
        <Text
          className="text-primary"
          onPress={() => Linking.openURL('https://example.com/privacy')}>
          Política de Privacidade
        </Text>
      </Text>
    </View>
  );
}
