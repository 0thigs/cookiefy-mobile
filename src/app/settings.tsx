import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { useNavigation } from '../hooks/useNavigation';
import i18n from '../i18n';
import { deleteRecipe, getDraftDetail, listDraftRecipes, listMyRecipes, publishRecipe, type RecipeBrief, type RecipeDetail } from '../services/recipes';
import { colors } from '../theme/colors';

export default function SettingsScreen() {
  const { handleTabPress } = useNavigation();
  const { t } = useTranslation();
  const [activeTab] = useState('profile');

  const [openDrafts, setOpenDrafts] = useState(false);
  const [openPublished, setOpenPublished] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [drafts, setDrafts] = useState<RecipeBrief[]>([]);
  const [published, setPublished] = useState<RecipeBrief[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pagePub, setPagePub] = useState(1);
  const [hasMorePub, setHasMorePub] = useState(true);
  const [selected, setSelected] = useState<RecipeDetail | null>(null);
  const [selectedKind, setSelectedKind] = useState<'draft'|'published'|null>(null);
  const [openLanguageModal, setOpenLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'pt-BR');

  useEffect(()=>{
    AsyncStorage.getItem('language').then((lang) => {
      if (lang) setCurrentLanguage(lang);
    }).catch(() => {});
  }, []);

  async function loadDrafts(reset = false) {
    if (loadingList) return;
    setLoadingList(true);
    try {
      const p = reset ? 1 : page;
      const res = await listDraftRecipes({ page: p, pageSize: 20 });
      setHasMore(res.data.length === 20);
      if (reset) {
        setDrafts(res.data);
        setPage(1);
      } else {
        setDrafts((prev) => [...prev, ...res.data]);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetailDraft(id: string) {
    setLoadingDetail(true);
    try {
      const detail = await getDraftDetail(id);
      setSelected(detail);
      setSelectedKind('draft');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadPublished(reset=false) {
    if (loadingList) return;
    setLoadingList(true);
    try {
      const p = reset ? 1 : pagePub;
      const res = await listMyRecipes({ page: p, pageSize: 20 });
      const pubs = (res.data as any[]).filter((r) => r.status === 'PUBLISHED');
      setHasMorePub(pubs.length === 20);
      if (reset) {
        setPublished(pubs);
        setPagePub(1);
      } else {
        setPublished((prev) => [...prev, ...pubs]);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadDrafts(true);
  }, []);

  const handlePublish = async (id: string) => {
    try {
      await publishRecipe(id);
      Alert.alert(t('common.success'), t('newRecipe.success'));
      setSelected(null);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t('common.delete'), t('common.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await deleteRecipe(id);
          setSelected(null);
          setDrafts((prev)=> prev.filter(r=> r.id !== id));
          setPublished((prev)=> prev.filter(r=> r.id !== id));
          Alert.alert(t('common.success'), t('common.success'));
        } catch (e:any) {
          Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
        }
      }}
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row gap-3 items-center">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">{t('settings.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <Pressable
            className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
            onPress={() => setOpenDrafts((v) => !v)}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-base font-medium text-gray-800">{t('settings.drafts')}</Text>
            <View style={{ transform: [{ rotate: openDrafts ? '90deg' : '0deg' }] }}>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          {openDrafts && (
            <View className="px-4 py-4">
              {loadingList && drafts.length === 0 ? (
                <View className="items-center py-6">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : drafts.length === 0 ? (
                <Text className="text-gray-600">{t('common.empty')}</Text>
              ) : (
                <View>
                  {drafts.map((d) => (
                    <Pressable key={d.id} className="py-3 border-b border-gray-100 active:bg-gray-50"
                      onPress={() => loadDetailDraft(d.id)}>
                      <Text className="text-base text-gray-800">{d.title}</Text>
                      <Text className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</Text>
                    </Pressable>
                  ))}
                  {hasMore && (
                    <Pressable className="items-center py-2 mt-2 rounded-lg border border-gray-200"
                      onPress={() => { setPage((p)=>p+1); loadDrafts(false); }}>
                      <Text className="text-gray-700">{t('common.next')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <Pressable
            className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
            onPress={() => {
              setOpenPublished((v)=>!v);
              if(!openPublished && published.length===0) loadPublished(true);
            }}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons name="document-outline" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-base font-medium text-gray-800">{t('settings.published')}</Text>
            <View style={{ transform: [{ rotate: openPublished ? '90deg' : '0deg' }] }}>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          {openPublished && (
            <View className="px-4 py-4">
              {loadingList && published.length === 0 ? (
                <View className="items-center py-6">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : published.length === 0 ? (
                <Text className="text-gray-600">{t('common.empty')}</Text>
              ) : (
                <View>
                  {published.map((d) => (
                    <Pressable key={d.id} className="py-3 border-b border-gray-100 active:bg-gray-50"
                      onPress={async () => {
                        setLoadingDetail(true);
                        try {
                          const detail = await (await import('../services/recipes')).getRecipeDetail(d.id);
                          setSelected(detail);
                          setSelectedKind('published');
                        } catch (e:any) {
                          Alert.alert(t('common.error'), e?.message ?? t('common.unknown'));
                        } finally { setLoadingDetail(false); }
                      }}>
                      <Text className="text-base text-gray-800">{d.title}</Text>
                      <Text className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</Text>
                    </Pressable>
                  ))}
                  {hasMorePub && (
                    <Pressable className="items-center py-2 mt-2 rounded-lg border border-gray-200"
                      onPress={() => { setPagePub((p)=>p+1); loadPublished(false); }}>
                      <Text className="text-gray-700">{t('common.next')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <Pressable
            className="flex-row items-center border-b border-gray-50 px-4 py-4 active:bg-gray-50"
            onPress={() => setOpenLanguageModal(true)}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Ionicons name="language" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-base font-medium text-gray-800">{t('settings.language')}</Text>
            <Text className="text-sm text-gray-500">{currentLanguage === 'pt-BR' ? t('settings.languages.ptBR') : t('settings.languages.enUS')}</Text>
            <View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>

        <Modal transparent visible={openLanguageModal} animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/40">
            <View className="w-11/12 rounded-xl bg-white p-4">
              <Text className="mb-3 text-lg font-semibold text-gray-900">{t('settings.language')}</Text>
              <Pressable className="py-3" onPress={async () => {
                await AsyncStorage.setItem('language', 'pt-BR');
                i18n.changeLanguage('pt-BR');
                setCurrentLanguage('pt-BR');
                setOpenLanguageModal(false);
              }}>
                <Text className="text-base text-gray-800">{t('settings.languages.ptBR')}</Text>
              </Pressable>
              <Pressable className="py-3" onPress={async () => {
                await AsyncStorage.setItem('language', 'en-US');
                i18n.changeLanguage('en-US');
                setCurrentLanguage('en-US');
                setOpenLanguageModal(false);
              }}>
                <Text className="text-base text-gray-800">{t('settings.languages.enUS')}</Text>
              </Pressable>
              <Pressable className="items-center mt-4 rounded-lg bg-gray-100 py-3" onPress={() => setOpenLanguageModal(false)}>
                <Text className="text-gray-800">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {selected && (
          <View className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <Text className="mb-1 text-lg font-semibold text-gray-900">{selected.title}</Text>
            {!!selected.description && (
              <Text className="mb-2 text-gray-700">{selected.description}</Text>
            )}
            <View className="mb-2">
              <Text className="text-sm text-gray-600">{t('recipe.difficulty.label')}: {selected.difficulty ? t(`recipe.difficultyLevels.${selected.difficulty}`) : '-'}</Text>
              <Text className="text-sm text-gray-600">{t('recipe.prepTime')}: {selected.prepMinutes ?? '-'} min</Text>
              <Text className="text-sm text-gray-600">{t('recipe.cookTime')}: {selected.cookMinutes ?? '-'} min</Text>
              <Text className="text-sm text-gray-600">{t('recipe.servings')}: {selected.servings ?? '-'}</Text>
            </View>
            {selected.nutrition && (
              <View className="mb-2">
                <Text className="text-sm text-gray-600">{t('recipe.calories')}: {selected.nutrition.calories ?? '-'}</Text>
                <Text className="text-sm text-gray-600">{t('recipe.protein')}: {selected.nutrition.protein ?? '-'}</Text>
                <Text className="text-sm text-gray-600">{t('recipe.carbs')}: {selected.nutrition.carbs ?? '-'}</Text>
                <Text className="text-sm text-gray-600">{t('recipe.fat')}: {selected.nutrition.fat ?? '-'}</Text>
              </View>
            )}
            {!!selected.categories?.length && (
              <Text className="text-sm text-gray-600 mb-2">{t('home.categories')}: {selected.categories.map(c=>c.name).join(', ')}</Text>
            )}
            {!!selected.ingredients?.length && (
              <View className="mb-2">
                <Text className="text-sm font-medium text-gray-800">{t('recipe.ingredients')}</Text>
                {selected.ingredients!.map((i, idx) => (
                  <Text key={idx} className="text-sm text-gray-600">• {i.name}{i.amount ? ` - ${i.amount}${i.unit ? ' ' + i.unit : ''}`: ''}</Text>
                ))}
              </View>
            )}
            {!!selected.steps?.length && (
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-800">{t('recipe.steps')}</Text>
                {selected.steps!.map((s) => (
                  <Text key={s.order} className="text-sm text-gray-600">{s.order + 1}. {s.text}</Text>
                ))}
              </View>
            )}

            <View className="flex-row gap-2 mt-2">
              <Pressable
                className="flex-1 items-center rounded-lg border border-gray-300 py-3"
                onPress={() => router.push({ pathname: '/recipes/new', params: selectedKind==='draft' ? { draftId: selected!.id } : { recipeId: selected!.id } })}
              >
                <Text className="text-gray-800">{t('common.edit')}</Text>
              </Pressable>
              {selectedKind==='draft' ? (
                <Pressable
                  className="flex-1 items-center rounded-lg bg-primary py-3"
                  onPress={() => handlePublish(selected!.id)}
                >
                  <Text className="font-semibold text-white">{t('newRecipe.publishNow')}</Text>
                </Pressable>
              ) : null}
              <Pressable
                className="flex-1 items-center rounded-lg bg-red-500 py-3"
                onPress={() => handleDelete(selected!.id)}
              >
                <Text className="font-semibold text-white">{t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

