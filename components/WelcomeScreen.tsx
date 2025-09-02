import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';

const CookifyLogo = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-8">
    <Circle
      cx="60"
      cy="60"
      r="55"
      stroke="#FF6B35"
      strokeWidth="3"
      fill="none"
    />
    <Path
      d="M35 45 L85 45 L80 35 L40 35 Z"
      stroke="#FF6B35"
      strokeWidth="3"
      fill="none"
    />
    <Path
      d="M50 35 L50 25 L70 25 L70 35"
      stroke="#FF6B35"
      strokeWidth="3"
      fill="none"
    />
    <Path
      d="M60 50 L60 70 M55 70 L65 70"
      stroke="#FF6B35"
      strokeWidth="3"
      fill="none"
    />
    <Circle
      cx="60"
      cy="75"
      r="8"
      stroke="#FF6B35"
      strokeWidth="3"
      fill="none"
    />
  </Svg>
);

export default function WelcomeScreen() {
  return (
    <View className="flex-1 px-6 py-12 bg-white">
      <View className="items-center mt-16">
        <CookifyLogo />
      </View>

      <Text className="mb-4 text-3xl font-bold text-center text-gray-900">
        Bem-vindo ao Cookify
      </Text>

      <Text className="px-4 mb-12 text-base leading-6 text-center text-gray-600">
        Descubra receitas incríveis, organize seus favoritos e cozinhe com facilidade
      </Text>

      <View className="flex gap-4 mb-8 space-y-4">
        <TouchableOpacity className="px-6 py-4 bg-orange-500 rounded-xl active:bg-orange-600">
          <Text className="text-lg font-semibold text-center text-white">
            Entrar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="px-6 py-4 bg-white rounded-xl border-2 border-gray-300 active:bg-gray-50">
          <Text className="text-lg font-semibold text-center text-gray-900">
            Criar conta
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-auto mb-8">
        <Text className="text-sm leading-5 text-center text-gray-500">
          Ao continuar, você concorda com nossos{' '}
          <Text className="font-medium text-orange-500">Termos de Uso</Text>
          {' '}e{' '}
          <Text className="font-medium text-orange-500">Política de Privacidade</Text>
        </Text>
      </View>
    </View>
  );
}
