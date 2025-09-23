import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { getRecipeDetail, listPublicRecipes, RecipeBrief } from '../services/recipes';
import { colors } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { EmptyState } from '../components/EmptyState';

export default function Home() {
  const { me, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [feed, setFeed] = useState<(RecipeBrief & { _cover?: string | null })[]>([]);

  async function load(initial = false) {
    if (initial) setLoading(true);
    try {
      const res = await listPublicRecipes({ page: 1, pageSize: 10 });
      const first = res.data.slice(0, 6);
      const details = await Promise.allSettled(
        first.map((r: RecipeBrief) => getRecipeDetail(r.id))
      );
      const coverMap = new Map<string, string | null>();
      details.forEach((p: any) => {
        if (p.status === 'fulfilled') {
          const d = p.value;
          coverMap.set(d.id, d.photos?.[0]?.url ?? null);
        }
      });
      setFeed(
        res.data.map((r: RecipeBrief) => ({
          ...r,
          _cover: coverMap.get(r.id) ?? r.coverUrl ?? null,
        }))
      );
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  };

  const header = useMemo(
    () => (
      <View className="px-3 pt-4 pb-3 bg-white">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="justify-center items-center mr-3 w-10 h-10 rounded-full">
              <Image
                source={require('../../assets/images/logo.png')}
                style={{ width: 60, height: 60 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-base text-gray-500">
                Olá, {me?.name?.split(' ')[0] || 'Chef'}
              </Text>
              <Text className="text-base font-medium text-gray-900">
                O que vamos cozinhar hoje?
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3 items-center">
            <Pressable className="justify-center items-center w-12 h-12">
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </Pressable>
            <Pressable className="justify-center items-center w-12 h-12" onPress={signOut}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/search')}
          className="flex-row items-center px-4 py-3 bg-gray-50 rounded-xl"
        >
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <Text className="flex-1 py-2 ml-3 text-base text-gray-500">
            Buscar receitas, ingredientes
          </Text>
        </Pressable>

         <Text className="mt-6 mb-4 text-lg font-semibold">Para você</Text>
         
         <Pressable
           onPress={() => router.push('/recipes/new')}
           className="flex-row justify-center items-center px-4 py-3 mb-4 rounded-lg bg-primary"
         >
           <Ionicons name="add" size={20} color="#fff" />
           <Text className="ml-2 font-semibold text-white">Nova Receita</Text>
         </Pressable>
        </View>
      ),
      [me?.name]
    );

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    console.log(`Navegando para: ${tabId}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator />
        </View>
        <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  if (feed.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <EmptyState
          title="Nenhuma receita encontrada"
          description="Ainda não há receitas disponíveis. Que tal ser o primeiro a compartilhar uma receita deliciosa?"
          icon="restaurant-outline"
        />
        <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        className="flex-1"
        data={feed}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
