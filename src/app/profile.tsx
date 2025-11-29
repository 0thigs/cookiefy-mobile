import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { deleteAccount, updateUser } from '../services/users';

export default function Profile() {
  const { me, signOut, refreshMe } = useAuth();
  const { handleTabPress } = useNavigation();
  const { t } = useTranslation();

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
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteAccount();
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.message ?? t('common.unknown'));
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
      Alert.alert(t('common.success'), t('profile.title') + ' ' + t('common.success').toLowerCase());
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('common.unknown'));
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

          <Pressable
            className="mt-6 w-full items-center rounded-lg border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
            onPress={() => router.push('/settings')}
          >
            <Text className="text-base font-medium text-gray-800">{t('profile.settings')}</Text>
          </Pressable>

          {me?.role === 'ADMIN' && (
            <View className="mt-4 w-full">
              <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <Pressable
                  className="flex-row items-center px-4 py-4 active:bg-gray-50"
                  onPress={() => router.push('/admin/dashboard')}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <Ionicons name="shield-checkmark-outline" size={20} color="#9333EA" />
                  </View>
                  <Text className="flex-1 text-base font-medium text-gray-800">
                    {t('profile.adminDashboard')}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>
          )}

          <View className="mt-4 w-full">
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
                  {t('profile.editProfile')}
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
                  <Text className="mb-4 text-lg font-bold text-gray-800">{t('profile.editProfile')}</Text>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm text-gray-500">{t('auth.name')}</Text>
                    <TextInput
                      className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800"
                      value={name}
                      placeholder={t('auth.namePlaceholder')}
                      onChangeText={setName}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm text-gray-500">{t('auth.email')}</Text>
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
                    <Text className="mb-2 text-sm text-gray-500">{t('profile.photoUrl')}</Text>
                    <TextInput
                      className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800"
                      value={photoUrl ?? ''}
                      placeholder={t('profile.photoUrlPlaceholder')}
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
                        <Text className="font-bold text-white">{t('common.save')}</Text>
                      )}
                    </Pressable>
                    <Pressable
                      className="items-center rounded-lg border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
                      onPress={() => setExpandedSection(null)}>
                      <Text className="text-gray-800">{t('common.cancel')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
                onPress={() => router.push('/settings')}>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="settings-outline" size={20} color="#3B82F6" />
                </View>
                <Text className="flex-1 text-base font-medium text-gray-800">{t('profile.settings')}</Text>
                <View
                  style={{
                    transform: [{ rotate: expandedSection === 'settings' ? '90deg' : '0deg' }],
                  }}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </Pressable>

              {false && (
                <View className="w-full bg-white px-4 py-4">
                  <Text className="mb-3 text-base text-gray-700">Ações rápidas</Text>
                  <Pressable
                    className="mb-2 rounded-lg border border-gray-200 bg-white px-3 py-3 active:bg-gray-50"
                    onPress={() => router.push('/settings')}>
                    <Text className="text-gray-800">{t('profile.settings')}</Text>
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
                <Text className="flex-1 text-base font-medium text-gray-800">{t('profile.logout')}</Text>
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
              <Text className="text-base font-bold text-white">{t('profile.deleteAccount')}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <BottomNavBar activeTab="profile" onTabPress={handleTabPress} />
    </View>
  );
}

