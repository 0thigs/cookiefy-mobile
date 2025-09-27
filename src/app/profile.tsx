import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { deleteAccount, updateUser } from '../services/users';
import { router } from 'expo-router';
import { BottomNavBar } from '../components/BottomNavBar';

export default function Profile() {
  const { me, signOut, refreshMe } = useAuth();
  const { handleTabPress } = useNavigation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [name, setName] = useState<string>(me?.name ?? '');
  const [email, setEmail] = useState<string>(me?.email ?? '');
  const [photoUrl, setPhotoUrl] = useState<string>(me?.photoUrl ?? '');

  useEffect(() => {
    setName(me?.name ?? '');
    setEmail(me?.email ?? '');
    setPhotoUrl(me?.photoUrl ?? '');
  }, [me]);

  async function handleDelete() {
    Alert.alert('Deletar conta', 'Tem certeza? Esta ação é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteAccount();
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (err: any) {
            Alert.alert('Erro', err?.message ?? 'Não foi possível deletar a conta');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function onSave() {
    setSaving(true);
    try {
      await updateUser({ name: name.trim(), email: email.trim(), photoUrl: photoUrl || null });
      await refreshMe();
      setExpandedSection(null);
      Alert.alert('Sucesso', 'Perfil atualizado');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="items-center justify-between px-5 pt-3">
          <View className="mb-2 ">
            <View className="z-10 h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-400 shadow-lg">
              {me?.photoUrl ? (
                <Image source={{ uri: me.photoUrl }} className="h-28 w-28 rounded-full" />
              ) : (
                <Ionicons name="person" size={56} color="#fff" />
              )}
            </View>
          </View>

          <Text className="mt-2 text-2xl font-bold text-gray-800">{me?.name ?? 'Chef'}</Text>

          <View className="mt-2 w-full flex-row justify-center px-2">
            <Text className="text-center text-lg text-gray-800">{me?.email ?? '-'}</Text>
          </View>

          <View className="mt-6 w-full">
            <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <Pressable
                className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
                onPress={() =>
                  setExpandedSection((prev) => (prev === 'profile' ? null : 'profile'))
                }>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <Ionicons name="person-outline" size={20} color="#F37A2D" />
                </View>
                <Text className="flex-1 text-base font-medium text-gray-800">
                  Detalhes do perfil
                </Text>
                <View
                  style={{
                    transform: [{ rotate: expandedSection === 'profile' ? '90deg' : '0deg' }],
                  }}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </Pressable>

              {expandedSection === 'profile' && (
                <View className="w-full bg-white px-4 py-4">
                  <Text className="mb-4 text-lg font-bold text-gray-800">Detalhes do perfil</Text>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm text-gray-500">Nome</Text>
                    <TextInput
                      className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800"
                      value={name}
                      placeholder="Seu nome"
                      onChangeText={setName}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm text-gray-500">Email</Text>
                    <TextInput
                      className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800"
                      value={email}
                      placeholder="seu@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={setEmail}
                    />
                  </View>

                  <View className="mb-6">
                    <Text className="mb-2 text-sm text-gray-500">Foto (URL)</Text>
                    <TextInput
                      className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800"
                      value={photoUrl ?? ''}
                      placeholder="URL da foto"
                      onChangeText={(t) => setPhotoUrl(t)}
                    />
                  </View>

                  <View className="flex-row">
                    <Pressable
                      className="mr-2 flex-1 items-center rounded-lg bg-orange-500 px-4 py-3 active:bg-orange-600"
                      onPress={onSave}
                      disabled={saving}
                      style={{ backgroundColor: '#F37A2D' }}>
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="font-bold text-white">Salvar</Text>
                      )}
                    </Pressable>
                    <Pressable
                      className="items-center rounded-lg border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
                      onPress={() => setExpandedSection(null)}>
                      <Text className="text-gray-800">Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
                onPress={() =>
                  setExpandedSection((prev) => (prev === 'settings' ? null : 'settings'))
                }>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="settings-outline" size={20} color="#3B82F6" />
                </View>
                <Text className="flex-1 text-base font-medium text-gray-800">Configurações</Text>
                <View
                  style={{
                    transform: [{ rotate: expandedSection === 'settings' ? '90deg' : '0deg' }],
                  }}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </Pressable>

              {expandedSection === 'settings' && (
                <View className="w-full bg-white px-4 py-4">
                  <Text className="mb-3 text-base text-gray-700">Ações rápidas</Text>
                  <Pressable
                    className="mb-2 rounded-lg border border-gray-200 bg-white px-3 py-3 active:bg-gray-50"
                    onPress={() => router.push('/settings')}>
                    <Text className="text-gray-800">Abrir configurações</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                className="flex-row items-center px-4 py-4 active:bg-gray-50"
                onPress={async () => {
                  await signOut();
                  router.replace('/(auth)/welcome');
                }}>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text className="flex-1 text-base font-medium text-gray-800">Sair</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={handleDelete}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-red-500 p-4 shadow-sm active:bg-red-600">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">Deletar conta</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="profile" onTabPress={handleTabPress} />
    </View>
  );
}
