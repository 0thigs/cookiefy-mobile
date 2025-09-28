import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { listPublicRecipes, getRecipeDetail, RecipeBrief } from '../services/recipes';
import { colors } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { EmptyState } from '../components/EmptyState';
import { useNavigation } from '../hooks/useNavigation';

interface SearchFilters {
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
  { value: 'newest', label: 'Mais Recentes' },
  { value: 'oldest', label: 'Mais Antigas' },
  { value: 'title_asc', label: 'Título A-Z' },
  { value: 'title_desc', label: 'Título Z-A' },
  { value: 'prep_time_asc', label: 'Menor Tempo de Prep' },
  { value: 'prep_time_desc', label: 'Maior Tempo de Prep' },
  { value: 'cook_time_asc', label: 'Menor Tempo de Cozimento' },
  { value: 'cook_time_desc', label: 'Maior Tempo de Cozimento' },
];

export default function SearchScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [recipes, setRecipes] = useState<(RecipeBrief & { _cover?: string | null })[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleTabPress } = useNavigation();

  const [filters, setFilters] = useState<SearchFilters>({
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
    sort: 'newest',
    authorName: '',
  });

  const searchParams = useMemo(() => {
    const params: any = {};

    // Adicionar apenas parâmetros não vazios
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

  const computeErrors = useCallback((f: SearchFilters) => {
    const e: Record<string, string> = {};

    const INT32_MAX_STR = '2147483647';
    const exceedsMaxInt32 = (val?: string) => {
      if (!val) return false;
      const t = String(val).trim();
      if (t === '') return false;
      // only digits considered
      const digits = t.replace(/\D/g, '');
      if (digits.length === 0) return false;
      if (digits.length > 10) return true;
      if (digits.length < 10) return false;
      return digits > INT32_MAX_STR;
    };

    const pair = (minField: keyof SearchFilters, maxField: keyof SearchFilters, label: string) => {
      const min = toNum(f[minField] as string);
      const max = toNum(f[maxField] as string);
      if (min != null && max != null && min > max) {
        e[minField as string] = `${label}: mínimo maior que máximo`;
        e[maxField as string] = `${label}: mínimo maior que máximo`;
      }
    };

    // Pares de intervalo
    pair('minPrep', 'maxPrep', 'Tempo de preparo');
    pair('minCook', 'maxCook', 'Tempo de cozimento');
    pair('totalTimeMin', 'totalTimeMax', 'Tempo total');
    pair('minServings', 'maxServings', 'Porções');

    // Campos que devem ser >= 0 (exceto porções)
    const nonNegative: (keyof SearchFilters)[] = [
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
        e[k as string] = 'Valor não pode ser negativo';
        return;
      }
      if (exceedsMaxInt32(v)) {
        e[k as string] = 'Valor excede o máximo permitido';
      }
    });

    // Porções devem ser >= 1
    (['minServings', 'maxServings'] as (keyof SearchFilters)[]).forEach((k) => {
      const v = f[k];
      const n = toNum(v);
      if (n != null && n < 1) {
        e[k as string] = 'Porções deve ser no mínimo 1';
      }
      if (exceedsMaxInt32(v)) {
        e[k as string] = 'Valor excede o máximo permitido';
      }
    });

    return e;
  }, []);

  const handleNumericChange = (field: keyof SearchFilters, text: string) => {
    // Mantém apenas dígitos para evitar negativos e caracteres inválidos
    const sanitized = (text || '').replace(/[^\d]/g, '');
    setFilters((prev) => ({ ...prev, [field]: sanitized }) as SearchFilters);
  };

  async function searchRecipes(resetPage = true) {
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

      const res = await listPublicRecipes(params);

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
        isFavorited: r.isFavorited || false, // Inclui status de favorito
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
      console.error('Erro ao buscar receitas:', error);
    } finally {
      setLoading(false);
    }
  }

  // Recalcula erros sempre que filtros mudarem
  useEffect(() => {
    setErrors(computeErrors(filters));
  }, [filters, computeErrors]);

  // Busca com debounce para texto, imediata para outros filtros (apenas se sem erros)
  useEffect(() => {
    const hasErr = Object.keys(errors).length > 0;
    if (hasErr) return;

    const timeoutId = setTimeout(
      () => {
        searchRecipes(true);
      },
      filters.q ? 500 : 100
    );

    return () => clearTimeout(timeoutId);
  }, [filters, errors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await searchRecipes(true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage((prev) => prev + 1);
      searchRecipes(false);
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
      sort: 'newest',
      authorName: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value.trim() !== '' && value !== 'newest'
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
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
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

          {/* Tempo de Cozimento */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">
              Tempo de Cozimento (min)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Mínimo</Text>
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
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
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
            <Text className="mb-3 text-lg font-semibold text-gray-900">Tempo Total (min)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Mínimo</Text>
                <TextInput
                  className={`rounded-lg border px-3 py-2 ${errors.totalTimeMin ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="15"
                  value={filters.totalTimeMin}
                  onChangeText={(text) => handleNumericChange('totalTimeMin', text)}
                  keyboardType="numeric"
                />
                {errors.totalTimeMin && (
                  <Text className="mt-1 text-xs text-red-600">{errors.totalTimeMin}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
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
              className={`rounded-lg border px-3 py-2 ${errors.maxCalories ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex: 500"
              value={filters.maxCalories}
              onChangeText={(text) => handleNumericChange('maxCalories', text)}
              keyboardType="numeric"
            />
            {errors.maxCalories && (
              <Text className="mt-1 text-xs text-red-600">{errors.maxCalories}</Text>
            )}
          </View>

          {/* Porções */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Porções</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-600">Mínimo</Text>
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
                <Text className="mb-1 text-sm text-gray-600">Máximo</Text>
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
              placeholder="Buscar receitas, ingredientes..."
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
          <Text className="text-sm text-gray-600">
            {totalResults} {totalResults === 1 ? 'receita encontrada' : 'receitas encontradas'}
          </Text>
          {hasActiveFilters && (
            <Pressable onPress={clearFilters}>
              <Text className="text-sm text-primary">Limpar filtros</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista de Receitas */}
      {loading && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">Buscando receitas...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="Nenhuma receita encontrada"
          description={
            hasActiveFilters
              ? 'Tente ajustar os filtros ou limpar para ver mais receitas.'
              : 'Não encontramos receitas com os critérios de busca.'
          }
          icon="search-outline"
        />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} onFavoriteToggle={() => {}} />}
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
