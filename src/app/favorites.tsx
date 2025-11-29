import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { EmptyState } from '../components/EmptyState';
import { RecipeCard } from '../components/RecipeCard';
import { useNavigation } from '../hooks/useNavigation';
import { getFavorites, getFavoritesStats, getRecipeDetail, RecipeBrief } from '../services/recipes';
import { colors } from '../theme/colors';

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

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const DIFFICULTY_OPTIONS = useMemo(() => [
    { value: '', label: t('favorites.filters.difficulty.all') },
    { value: 'EASY', label: t('favorites.filters.difficulty.easy') },
    { value: 'MEDIUM', label: t('favorites.filters.difficulty.medium') },
    { value: 'HARD', label: t('favorites.filters.difficulty.hard') },
  ], [t]);

  const SORT_OPTIONS = useMemo(() => [
    { value: 'favorited_desc', label: t('favorites.filters.sort.favoritedDesc') },
    { value: 'favorited_asc', label: t('favorites.filters.sort.favoritedAsc') },
    { value: 'newest', label: t('favorites.filters.sort.newest') },
    { value: 'oldest', label: t('favorites.filters.sort.oldest') },
    { value: 'title_asc', label: t('favorites.filters.sort.titleAsc') },
    { value: 'title_desc', label: t('favorites.filters.sort.titleDesc') },
    { value: 'prep_time_asc', label: t('favorites.filters.sort.prepTimeAsc') },
    { value: 'prep_time_desc', label: t('favorites.filters.sort.prepTimeDesc') },
  ], [t]);

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Helpers de validação e sanitização
  const toNum = (v: string): number | null => {
    if (v == null) return null;
    const t = String(v).trim();
    if (t === '') return null;
    const n = parseInt(t, 10);
    return Number.isNaN(n) ? null : n;
  };

  const computeErrors = (f: FavoritesFilters) => {
    const e: Record<string, string> = {};

    const INT32_MAX_STR = '2147483647';
    const exceedsMaxInt32 = (val?: string) => {
      if (!val) return false;
      const tVal = String(val).trim();
      if (tVal === '') return false;
      const digits = tVal.replace(/\D/g, '');
      if (digits.length === 0) return false;
      if (digits.length > 10) return true;
      if (digits.length < 10) return false;
      return digits > INT32_MAX_STR;
    };

    const pair = (
      minField: keyof FavoritesFilters,
      maxField: keyof FavoritesFilters,
      label: string
    ) => {
      const min = toNum(f[minField] as string);
      const max = toNum(f[maxField] as string);
      if (min != null && max != null && min > max) {
        const msg = t('favorites.errors.minMax', { label });
        e[minField as string] = msg;
        e[maxField as string] = msg;
      }
    };

    // Pares de intervalo
    pair('minPrep', 'maxPrep', t('favorites.labels.prepTime'));
    pair('minCook', 'maxCook', t('favorites.labels.cookTime'));
    pair('totalTimeMin', 'totalTimeMax', t('favorites.labels.totalTime'));
    pair('minServings', 'maxServings', t('favorites.labels.servings'));

    // Campos que devem ser >= 0 (exceto porções)
    const nonNegative: (keyof FavoritesFilters)[] = [
      'minPrep',
      'maxPrep',
      'minCook',
      'maxCook',
      'totalTimeMin',
      'totalTimeMax',
      'maxCalories',
      'minProtein',
      'maxCarbs',
      'maxFat',
    ];
    nonNegative.forEach((k) => {
      const v = f[k] as string;
      const n = toNum(v);
      if (n != null && n < 0) {
        e[k as string] = t('favorites.errors.negative');
        return;
      }
      if (exceedsMaxInt32(v)) {
        e[k as string] = t('favorites.errors.maxExceeded');
      }
    });

    // Porções devem ser >= 1
    (['minServings', 'maxServings'] as (keyof FavoritesFilters)[]).forEach((k) => {
      const v = f[k];
      const n = toNum(v);
      if (n != null && n < 1) {
        e[k as string] = t('favorites.errors.minServings');
      }
      if (exceedsMaxInt32(v)) {
        e[k as string] = t('favorites.errors.maxExceeded');
      }
    });

    return e;
  };

  const handleNumericChange = (field: keyof FavoritesFilters, text: string) => {
    const sanitized = (text || '').replace(/[^\d]/g, '');
    setFilters((prev) => ({ ...prev, [field]: sanitized }) as FavoritesFilters);
  };

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
        isFavorited: true,
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

  // Revalida ao mudar filtros e busca apenas se não houver erros
  useEffect(() => {
    setErrors(computeErrors(filters));
  }, [filters]);

  useEffect(() => {
    const hasErr = Object.keys(errors).length > 0;
    if (hasErr) return;

    const timeoutId = setTimeout(
      () => {
        loadFavorites(true);
      },
      filters.q ? 500 : 100
    );

    return () => clearTimeout(timeoutId);
  }, [filters, errors]);

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
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId));
      setTotalResults((prev) => Math.max(0, prev - 1));

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
            <Text className="text-lg font-semibold text-primary">{t('common.cancel')}</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">{t('favorites.filters.title')}</Text>
          <Pressable onPress={clearFilters}>
            <Text className="text-lg font-semibold text-red-500">{t('common.clear')}</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Dificuldade */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.difficulty.title')}</Text>
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

          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.prepTime')}</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.min')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.minPrep ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0"
                  value={filters.minPrep}
                  onChangeText={(text) => handleNumericChange('minPrep', text)}
                  keyboardType="numeric"
                />
                {errors.minPrep && (
                  <Text className="mt-1 text-xs text-red-600">{errors.minPrep}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.max')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.maxPrep ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="120"
                  value={filters.maxPrep}
                  onChangeText={(text) => handleNumericChange('maxPrep', text)}
                  keyboardType="numeric"
                />
                {errors.maxPrep && (
                  <Text className="mt-1 text-xs text-red-600">{errors.maxPrep}</Text>
                )}
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              {t('favorites.filters.cookTime')}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.min')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.minCook ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0"
                  value={filters.minCook}
                  onChangeText={(text) => handleNumericChange('minCook', text)}
                  keyboardType="numeric"
                />
                {errors.minCook && (
                  <Text className="mt-1 text-xs text-red-600">{errors.minCook}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.max')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.maxCook ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="180"
                  value={filters.maxCook}
                  onChangeText={(text) => handleNumericChange('maxCook', text)}
                  keyboardType="numeric"
                />
                {errors.maxCook && (
                  <Text className="mt-1 text-xs text-red-600">{errors.maxCook}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Tempo Total */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.totalTime')}</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.min')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.totalTimeMin ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0"
                  value={filters.totalTimeMin}
                  onChangeText={(text) => handleNumericChange('totalTimeMin', text)}
                  keyboardType="numeric"
                />
                {errors.totalTimeMin && (
                  <Text className="mt-1 text-xs text-red-600">{errors.totalTimeMin}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.max')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.totalTimeMax ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="300"
                  value={filters.totalTimeMax}
                  onChangeText={(text) => handleNumericChange('totalTimeMax', text)}
                  keyboardType="numeric"
                />
                {errors.totalTimeMax && (
                  <Text className="mt-1 text-xs text-red-600">{errors.totalTimeMax}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Ingredientes */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.ingredients')}</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder={t('favorites.filters.ingredientsPlaceholder')}
              value={filters.ingredients}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, ingredients: text }))}
            />
            <Text className="mt-1 text-xs text-gray-500">
              {t('favorites.filters.ingredientsHelp')}
            </Text>
          </View>

          {/* Porções */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.servings')}</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.min')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.minServings ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="1"
                  value={filters.minServings}
                  onChangeText={(text) => handleNumericChange('minServings', text)}
                  keyboardType="numeric"
                />
                {errors.minServings && (
                  <Text className="mt-1 text-xs text-red-600">{errors.minServings}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">{t('common.max')}</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.maxServings ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="10"
                  value={filters.maxServings}
                  onChangeText={(text) => handleNumericChange('maxServings', text)}
                  keyboardType="numeric"
                />
                {errors.maxServings && (
                  <Text className="mt-1 text-xs text-red-600">{errors.maxServings}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Autor */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.author')}</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder={t('favorites.filters.authorPlaceholder')}
              value={filters.authorName}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, authorName: text }))}
            />
          </View>

          {/* Calorias */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.maxCalories')}</Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Ex: 500"
              value={filters.maxCalories}
              onChangeText={(text) => handleNumericChange('maxCalories', text)}
              keyboardType="numeric"
            />
            {errors.maxCalories && (
              <Text className="mt-1 text-xs text-red-600">{errors.maxCalories}</Text>
            )}
          </View>

          {/* Ordenação */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">{t('favorites.filters.sortBy')}</Text>
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
            <Text className="text-center font-semibold text-white">{t('favorites.filters.apply')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>

          <View className="flex-1 flex-row items-center rounded-xl bg-gray-50 px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              className="ml-3 flex-1 py-2 text-base"
              placeholder={t('favorites.searchPlaceholder')}
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

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-md text-gray-700">
            {t('favorites.resultsCount', { count: totalResults })}
          </Text>
          {hasActiveFilters && (
            <Pressable onPress={clearFilters}>
              <Text className="text-sm text-primary">{t('favorites.clearFilters')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">{t('favorites.loading')}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <EmptyState
          title={t('favorites.empty.title')}
          description={
            hasActiveFilters
              ? t('favorites.empty.descriptionFilters')
              : t('favorites.empty.description')
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
