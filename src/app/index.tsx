import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { getRecipeDetail, listPublicRecipes, RecipeBrief } from '../services/recipes';
import { colors } from '../theme/colors';

export default function Home() {
  const { t } = useTranslation();
  const { me, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [feed, setFeed] = useState<(RecipeBrief & { _cover?: string | null })[]>([]);
  
  const { handleTabPress } = useNavigation();

  async function load(initial = false) {
    if (initial) setLoading(true);
    try {
      const res = await listPublicRecipes({ page: 1, pageSize: 10 });
      console.log(res.data);
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
        res.data.map((r: any) => ({
          ...r,
          _cover: coverMap.get(r.id) ?? r.coverUrl ?? null,
          isFavorited: r.isFavorited || false, // Inclui status de favorito
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
                {t('home.welcome', { name: me?.name?.split(' ')[0] || 'Chef' })}
              </Text>
              <Text className="text-base font-medium text-gray-900">
                {t('home.subtitle')}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3 items-center">
            <Pressable className="justify-center items-center w-12 h-12">
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </Pressable>
            <Pressable className="justify-center items-center w-12 h-12" onPress={() => router.push('/settings')}>
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
            {t('search.placeholder')}
          </Text>
        </Pressable>

         <Text className="mt-6 mb-4 text-lg font-semibold">{t('home.forYou')}</Text>
         
         <Pressable
           onPress={() => router.push('/recipes/new')}
           className="flex-row justify-center items-center px-4 py-3 mb-4 rounded-lg bg-primary"
         >
           <Ionicons name="add" size={20} color="#fff" />
           <Text className="ml-2 font-semibold text-white">{t('recipe.new')}</Text>
         </Pressable>
        </View>
      ),
      [me?.name, t]
    );


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
          title={t('home.empty.title')}
          description={t('home.empty.description')}
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
        renderItem={({ item }) => <RecipeCard recipe={item} onFavoriteToggle={() => {}} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
