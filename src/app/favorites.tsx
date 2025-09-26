import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getFavorites, getRecipeDetail, getFavoritesStats, RecipeBrief } from '../services/recipes';
import { colors } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { EmptyState } from '../components/EmptyState';
import { useNavigation } from '../hooks/useNavigation';

interface FavoritesFilters {
  q: string;
  difficulty: string;
  minPrep: string;
  maxPrep: string;
  minCook: string;
  maxCook: string;
  totalTimeMin: string;
  totalTimeMax: string;
  categoryId: string;
  categorySlug: string;
  ingredient: string;
  ingredients: string;
  maxCalories: string;
  minProtein: string;
  maxCarbs: string;
  maxFat: string;
  minServings: string;
  maxServings: string;
  sort: string;
  authorName: string;
}

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'EASY', label: 'Fácil' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HARD', label: 'Difícil' },
];

const SORT_OPTIONS = [
  { value: 'favorited_desc', label: 'Favoritados Recentemente' },
  { value: 'favorited_asc', label: 'Favoritados Antigamente' },
  { value: 'newest', label: 'Receitas Mais Recentes' },
  { value: 'oldest', label: 'Receitas Mais Antigas' },
  { value: 'title_asc', label: 'Título A-Z' },
  { value: 'title_desc', label: 'Título Z-A' },
  { value: 'prep_time_asc', label: 'Menor Tempo de Prep' },
  { value: 'prep_time_desc', label: 'Maior Tempo de Prep' },
];

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');
  const [recipes, setRecipes] = useState<
    (RecipeBrief & { _cover?: string | null; favoritedAt: string })[]
  >([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<{
    totalFavorites: number;
    recentFavorites: number;
    mostFavoritedCategory: string;
    averageRating: number;
  } | null>(null);

  const { handleTabPress } = useNavigation();

  const [filters, setFilters] = useState<FavoritesFilters>({
    q: '',
    difficulty: '',
    minPrep: '',
    maxPrep: '',
    minCook: '',
    maxCook: '',
    totalTimeMin: '',
    totalTimeMax: '',
    categoryId: '',
    categorySlug: '',
    ingredient: '',
    ingredients: '',
    maxCalories: '',
    minProtein: '',
    maxCarbs: '',
    maxFat: '',
    minServings: '',
    maxServings: '',
    sort: 'favorited_desc',
    authorName: '',
  });

  const searchParams = useMemo(() => {
    const params: any = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value && String(value).trim() !== '') {
        params[key] = value;
      }
    });

    return params;
  }, [filters]);

  async function loadFavorites(resetPage = true) {
    if (resetPage) {
      setCurrentPage(1);
    }

    setLoading(true);
    try {
      const page = resetPage ? 1 : currentPage;
      const params = {
        ...searchParams,
        page,
        pageSize: 20,
      };

      const res = await getFavorites(params);

      const first = res.data.slice(0, 20);
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

      const recipesWithCovers = res.data.map((r: any) => ({
        ...r,
        _cover: coverMap.get(r.id) ?? r.coverUrl ?? null,
        isFavorited: true, // Todas as receitas na página de favoritos são favoritas
      }));

      if (resetPage) {
        setRecipes(recipesWithCovers);
        setHasMore(res.data.length === 20);
      } else {
        setRecipes((prev) => [...prev, ...recipesWithCovers]);
        setHasMore(res.data.length === 20);
      }

      setTotalResults(res.meta?.total || res.data.length);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const statsData = await getFavoritesStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  // Busca com debounce para texto, imediata para outros filtros
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        loadFavorites(true);
      },
      filters.q ? 500 : 100
    );

    return () => clearTimeout(timeoutId);
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites(true);
    setRefreshing(false);
  };

  const handleFavoriteToggle = (recipeId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // Se foi desfavoritado, remove da lista
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId));
      setTotalResults((prev) => Math.max(0, prev - 1));

      // Atualiza estatísticas
      if (stats) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                totalFavorites: Math.max(0, prev.totalFavorites - 1),
              }
            : null
        );
      }
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage((prev) => prev + 1);
      loadFavorites(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      difficulty: '',
      minPrep: '',
      maxPrep: '',
      minCook: '',
      maxCook: '',
      totalTimeMin: '',
      totalTimeMax: '',
      categoryId: '',
      categorySlug: '',
      ingredient: '',
      ingredients: '',
      maxCalories: '',
      minProtein: '',
      maxCarbs: '',
      maxFat: '',
      minServings: '',
      maxServings: '',
      sort: 'favorited_desc',
      authorName: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value.trim() !== '' && value !== 'favorited_desc'
  );

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
          <Pressable onPress={() => setShowFilters(false)}>
            <Text className="text-lg font-semibold text-primary">Cancelar</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Filtros</Text>
          <Pressable onPress={clearFilters}>
            <Text className="text-lg font-semibold text-red-500">Limpar</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Dificuldade */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Dificuldade</Text>
            <View className="flex-row flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setFilters((prev) => ({ ...prev, difficulty: option.value }))}
                  className={`rounded-full px-4 py-2 ${
                    filters.difficulty === option.value ? 'bg-primary' : 'bg-gray-100'
                  }`}>
                  <Text
                    className={`font-medium ${
                      filters.difficulty === option.value ? 'text-white' : 'text-gray-700'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Tempo de Preparo */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Tempo de Preparo (min)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Mínimo</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="0"
                  value={filters.minPrep}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, minPrep: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="120"
                  value={filters.maxPrep}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, maxPrep: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              Tempo de Cozimento (min)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Mínimo</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="0"
                  value={filters.minCook}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, minCook: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
                <TextInput
                  className="rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="180"
                  value={filters.maxCook}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, maxCook: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Ingredientes</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Ex: frango, cebola, alho"
              value={filters.ingredients}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, ingredients: text }))}
            />
            <Text className="mt-1 text-xs text-gray-500">
              Separe múltiplos ingredientes com vírgula
            </Text>
          </View>

          {/* Autor */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Autor</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Ex: João Silva"
              value={filters.authorName}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, authorName: text }))}
            />
          </View>

          {/* Calorias */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Calorias Máximas</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Ex: 500"
              value={filters.maxCalories}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, maxCalories: text }))}
              keyboardType="numeric"
            />
          </View>

          {/* Ordenação */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Ordenar por</Text>
            <View className="space-y-2">
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setFilters((prev) => ({ ...prev, sort: option.value }))}
                  className={`flex-row items-center rounded-lg p-3 ${
                    filters.sort === option.value ? 'bg-primary/10' : 'bg-gray-50'
                  }`}>
                  <View
                    className={`mr-3 h-5 w-5 rounded-full border-2 ${
                      filters.sort === option.value
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    }`}>
                    {filters.sort === option.value && (
                      <View className="m-0.5 h-2 w-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text
                    className={`font-medium ${
                      filters.sort === option.value ? 'text-primary' : 'text-gray-700'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-gray-200 p-4">
          <Pressable onPress={() => setShowFilters(false)} className="rounded-lg bg-primary py-3">
            <Text className="text-center font-semibold text-white">Aplicar Filtros</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>

          <View className="flex-1 flex-row items-center rounded-xl bg-gray-50 px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              className="ml-3 flex-1 py-2 text-base"
              placeholder="Buscar favoritos..."
              value={filters.q}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, q: text }))}
              returnKeyType="search"
            />
            {filters.q.length > 0 && (
              <Pressable onPress={() => setFilters((prev) => ({ ...prev, q: '' }))}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setShowFilters(true)}
            className={`rounded-lg p-3 ${hasActiveFilters ? 'bg-primary' : 'bg-gray-100'}`}>
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? 'white' : colors.muted}
            />
          </Pressable>
        </View>

        {/* Resultados */}
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-md text-gray-700">
            {totalResults} {totalResults === 1 ? 'receita encontrada' : 'receitas encontradas'}
          </Text>
          {hasActiveFilters && (
            <Pressable onPress={clearFilters}>
              <Text className="text-sm text-primary">Limpar filtros</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista de Favoritos */}
      {loading && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">Carregando favoritos...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="Nenhum favorito encontrado"
          description={
            hasActiveFilters
              ? 'Tente ajustar os filtros ou limpar para ver mais favoritos.'
              : 'Você ainda não tem receitas favoritadas. Que tal começar a salvar suas receitas favoritas?'
          }
          icon="heart-outline"
        />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onFavoriteToggle={handleFavoriteToggle} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            loading && recipes.length > 0 ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {renderFilterModal()}
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
