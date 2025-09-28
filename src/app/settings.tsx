import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../hooks/useNavigation';
import { BottomNavBar } from '../components/BottomNavBar';
import { colors } from '../theme/colors';
import { listDraftRecipes, getDraftDetail, publishRecipe, listMyRecipes, deleteRecipe, type RecipeBrief, type RecipeDetail } from '../services/recipes';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { handleTabPress } = useNavigation();
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
      Alert.alert('Erro', e?.message ?? 'Não foi possível listar rascunhos');
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
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar o rascunho');
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
      Alert.alert('Erro', e?.message ?? 'Não foi possível listar receitas');
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
      Alert.alert('Publicado', 'Receita publicada com sucesso');
      setSelected(null);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível publicar');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Excluir', 'Tem certeza que deseja excluir esta receita?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await deleteRecipe(id);
          setSelected(null);
          setDrafts((prev)=> prev.filter(r=> r.id !== id));
          setPublished((prev)=> prev.filter(r=> r.id !== id));
          Alert.alert('Excluída', 'Receita removida');
        } catch (e:any) {
          Alert.alert('Erro', e?.message ?? 'Não foi possível excluir');
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
          <Text className="text-lg font-semibold text-gray-900">Configurações</Text>
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
            <Text className="flex-1 text-base font-medium text-gray-800">Rascunhos</Text>
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
                <Text className="text-gray-600">Nenhum rascunho encontrado.</Text>
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
                      <Text className="text-gray-700">Carregar mais</Text>
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
            <Text className="flex-1 text-base font-medium text-gray-800">Receitas Publicadas</Text>
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
                <Text className="text-gray-600">Nenhuma receita publicada encontrada.</Text>
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
                          Alert.alert('Erro', e?.message ?? 'Não foi possível carregar');
                        } finally { setLoadingDetail(false); }
                      }}>
                      <Text className="text-base text-gray-800">{d.title}</Text>
                      <Text className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</Text>
                    </Pressable>
                  ))}
                  {hasMorePub && (
                    <Pressable className="items-center py-2 mt-2 rounded-lg border border-gray-200"
                      onPress={() => { setPagePub((p)=>p+1); loadPublished(false); }}>
                      <Text className="text-gray-700">Carregar mais</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {selected && (
          <View className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <Text className="mb-1 text-lg font-semibold text-gray-900">{selected.title}</Text>
            {!!selected.description && (
              <Text className="mb-2 text-gray-700">{selected.description}</Text>
            )}
            <View className="mb-2">
              <Text className="text-sm text-gray-600">Dificuldade: {selected.difficulty ?? '-'}</Text>
              <Text className="text-sm text-gray-600">Preparo: {selected.prepMinutes ?? '-'} min</Text>
              <Text className="text-sm text-gray-600">Cozimento: {selected.cookMinutes ?? '-'} min</Text>
              <Text className="text-sm text-gray-600">Porções: {selected.servings ?? '-'}</Text>
            </View>
            {selected.nutrition && (
              <View className="mb-2">
                <Text className="text-sm text-gray-600">Calorias: {selected.nutrition.calories ?? '-'}</Text>
                <Text className="text-sm text-gray-600">Proteína: {selected.nutrition.protein ?? '-'}</Text>
                <Text className="text-sm text-gray-600">Carboidratos: {selected.nutrition.carbs ?? '-'}</Text>
                <Text className="text-sm text-gray-600">Gorduras: {selected.nutrition.fat ?? '-'}</Text>
              </View>
            )}
            {!!selected.categories?.length && (
              <Text className="text-sm text-gray-600 mb-2">Categorias: {selected.categories.map(c=>c.name).join(', ')}</Text>
            )}
            {!!selected.ingredients?.length && (
              <View className="mb-2">
                <Text className="text-sm font-medium text-gray-800">Ingredientes</Text>
                {selected.ingredients!.map((i, idx) => (
                  <Text key={idx} className="text-sm text-gray-600">• {i.name}{i.amount ? ` - ${i.amount}${i.unit ? ' ' + i.unit : ''}`: ''}</Text>
                ))}
              </View>
            )}
            {!!selected.steps?.length && (
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-800">Passos</Text>
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
                <Text className="text-gray-800">Editar</Text>
              </Pressable>
              {selectedKind==='draft' ? (
                <Pressable
                  className="flex-1 items-center rounded-lg bg-primary py-3"
                  onPress={() => handlePublish(selected!.id)}
                >
                  <Text className="font-semibold text-white">Publicar</Text>
                </Pressable>
              ) : null}
              <Pressable
                className="flex-1 items-center rounded-lg bg-red-500 py-3"
                onPress={() => handleDelete(selected!.id)}
              >
                <Text className="font-semibold text-white">Excluir</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
