import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listPendingRecipes, listAllRecipesAdmin, moderateRecipe } from '../../services/admin';
import { deleteRecipe } from '../../services/recipes';
import { colors } from '../../theme/colors';
import type { RecipeBrief } from '../../services/recipes';

export default function AdminDashboard() {
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [recipes, setRecipes] = useState<RecipeBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function load(reset = false) {
    if (reset) setLoading(true);
    try {
      const p = reset ? 1 : page;
      let res;
      
      if (tab === 'PENDING') {
        res = await listPendingRecipes(p);
      } else {
        res = await listAllRecipesAdmin(p, search);
      }

      if (reset) {
        setRecipes(res.data);
      } else {
        setRecipes(prev => [...prev, ...res.data]);
      }
      setHasMore(res.data.length >= 20);
      setPage(p);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar receitas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); }, [tab]);

  async function handleModerate(id: string, status: 'PUBLISHED' | 'REJECTED') {
    try {
      await moderateRecipe(id, status);
      Alert.alert('Sucesso', `Receita ${status === 'PUBLISHED' ? 'aprovada' : 'rejeitada'}`);
      load(true);
    } catch {
      Alert.alert('Erro', 'Falha na moderação');
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Excluir', 'Tem certeza absoluta? Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          try {
            await deleteRecipe(id);
            setRecipes(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Erro', 'Falha ao excluir');
          }
        }
      }
    ]);
  }

  function handleEdit(id: string) {
    router.push({ pathname: '/recipes/new', params: { recipeId: id } });
  }

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case 'PUBLISHED': return <View className="px-2 py-1 bg-green-100 rounded"><Text className="text-xs font-bold text-green-700">Publicada</Text></View>;
      case 'REJECTED': return <View className="px-2 py-1 bg-red-100 rounded"><Text className="text-xs font-bold text-red-700">Rejeitada</Text></View>;
      default: return <View className="px-2 py-1 bg-yellow-100 rounded"><Text className="text-xs font-bold text-yellow-700">Rascunho</Text></View>;
    }
  }

  const renderItem = ({ item }: { item: RecipeBrief }) => (
    <View className="p-4 mb-3 bg-white border border-gray-200 shadow-sm rounded-xl">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-gray-800">{item.title}</Text>
          <Text className="text-sm text-gray-500">Por: {item.author?.name || 'Desconhecido'}</Text>
        </View>
        {getStatusBadge(item.status)}
      </View>
      
      {tab === 'PENDING' ? (
        <View className="flex-row gap-3 pt-2 mt-2 border-t border-gray-100">
           <Pressable onPress={() => router.push(`/recipes/${item.id}`)} className="items-center flex-1 py-2 border border-gray-300 rounded-lg">
             <Text className="font-medium text-gray-700">Ver</Text>
           </Pressable>
           <Pressable onPress={() => handleModerate(item.id, 'REJECTED')} className="items-center flex-1 py-2 bg-red-100 rounded-lg">
             <Text className="font-bold text-red-700">Rejeitar</Text>
           </Pressable>
           <Pressable onPress={() => handleModerate(item.id, 'PUBLISHED')} className="items-center flex-1 py-2 bg-green-100 rounded-lg">
             <Text className="font-bold text-green-700">Aprovar</Text>
           </Pressable>
        </View>
      ) : (
        <View className="flex-row gap-3 pt-2 mt-2 border-t border-gray-100">
           <Pressable onPress={() => handleEdit(item.id)} className="flex-row items-center justify-center flex-1 gap-2 py-2 rounded-lg bg-blue-50">
             <Ionicons name="create-outline" size={16} color="#2563EB" />
             <Text className="font-medium text-blue-700">Editar</Text>
           </Pressable>
           <Pressable onPress={() => handleDelete(item.id)} className="flex-row items-center justify-center flex-1 gap-2 py-2 rounded-lg bg-red-50">
             <Ionicons name="trash-outline" size={16} color="#DC2626" />
             <Text className="font-medium text-red-700">Excluir</Text>
           </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-12 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Gestão de Receitas</Text>
        </View>

        {/* Tabs */}
        <View className="flex-row">
          <Pressable 
            onPress={() => setTab('PENDING')} 
            className={`flex-1 pb-3 border-b-2 ${tab === 'PENDING' ? 'border-primary' : 'border-transparent'}`}
          >
            <Text className={`text-center font-bold ${tab === 'PENDING' ? 'text-primary' : 'text-gray-500'}`}>
              Pendentes
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => setTab('ALL')} 
            className={`flex-1 pb-3 border-b-2 ${tab === 'ALL' ? 'border-primary' : 'border-transparent'}`}
          >
            <Text className={`text-center font-bold ${tab === 'ALL' ? 'text-primary' : 'text-gray-500'}`}>
              Todas
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === 'ALL' && (
        <View className="p-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center px-3 py-2 bg-gray-100 rounded-lg">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Buscar por título ou autor..." 
              className="flex-1 ml-2"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => load(true)}
            />
          </View>
        </View>
      )}

      {loading && page === 1 ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onEndReached={() => { if (hasMore) setPage(p => p + 1); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-gray-500">Nenhuma receita encontrada.</Text>
          }
        />
      )}
    </View>
  );
}
