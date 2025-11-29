import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { addFavorite, getRecipeDetail, removeFavorite, type RecipeDetail } from '../../services/recipes';
import { addItemToList, addRecipeToList } from '../../services/shopping-list';
import { getUserById, type User } from '../../services/users';
// import { API_BASE_URL } from '../../lib/config';
import { BottomNavBar } from '../../components/BottomNavBar';
import { ReviewsTab } from '../../components/reviews/ReviewsTab';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { colors } from '../../theme/colors';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const { width: screenWidth } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const { handleTabPress } = useNavigation();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTab, setSelectedTab] = useState<'details' | 'reviews'>('details');
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    if (id) {
      loadRecipe();
    }
  }, [id]);

  async function loadRecipe() {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getRecipeDetail(id);
      
      // O campo isFavorited já vem da API, não precisa verificar separadamente
      
      setRecipe(data);
      
      if (!data.author && data.authorId) {
        try {
          const authorData = await getUserById(data.authorId);
          setAuthor(authorData);
        } catch (error) {
          console.error('Erro ao carregar dados do autor:', error);
          setAuthor({
            id: data.authorId,
            name: `Usuário ${data.authorId.slice(0, 8)}`,
            email: '',
            photoUrl: null,
            createdAt: ''
          });
        }
      } else if (data.author) {
        setAuthor({
          id: data.author.id,
          name: data.author.name,
          email: '',
          photoUrl: data.author.photoUrl,
          createdAt: ''
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar receita:', error);
      Alert.alert(t('common.error'), t('recipe.loadError'));
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!recipe || favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      if (recipe.isFavorited) {
        await removeFavorite(recipe.id);
        setRecipe(prev => prev ? { ...prev, isFavorited: false } : null);
      } else {
        await addFavorite(recipe.id);
        setRecipe(prev => prev ? { ...prev, isFavorited: true } : null);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), t('recipe.favoriteError'));
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function shareRecipe() {
    if (!recipe) return;
    
    try {
      await Share.share({
        message: t('recipe.shareMessage', { title: recipe.title }),
        title: recipe.title,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  }

  async function handleDownloadPdf() {
    if (!recipe?.id) return;
    if (!API_BASE_URL) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }
    try {
      const url = `${API_BASE_URL}/recipes/${recipe.id}/pdf`;
      // abrir no navegador/handler do SO para permitir download
      await Linking.openURL(url);
    } catch (error: any) {
      console.error('Erro ao abrir PDF:', error);
      Alert.alert(t('common.error'), t('recipe.pdfError'));
    }
  }

  function getDifficultyText(difficulty?: string) {
    switch (difficulty) {
      case 'EASY': return t('recipe.difficulty.easy');
      case 'MEDIUM': return t('recipe.difficulty.medium');
      case 'HARD': return t('recipe.difficulty.hard');
      default: return t('common.unknown');
    }
  }

  function getDifficultyColor(difficulty?: string) {
    switch (difficulty) {
      case 'EASY': return '#10B981';
      case 'MEDIUM': return '#F59E0B';
      case 'HARD': return '#EF4444';
      default: return colors.muted;
    }
  }

  function formatDuration(minutes?: number | null) {
    if (!minutes) return t('common.unknown');
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  function formatNutritionValue(value?: number, unit?: string) {
    if (value === undefined || value === null) return 'N/A';
    return `${value}${unit || ''}`;
  }

  async function handleAddAllIngredientsToList() {
    if (!recipe || addingToList) return;

    setAddingToList(true);
    try {
      const result = await addRecipeToList(recipe.id);
      Alert.alert(
        t('common.success'),
        t('recipe.addedIngredients', { count: result.count }),
        [
          { text: 'OK' },
          { text: t('recipe.viewList'), onPress: () => router.push('/shopping-list') }
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), t('recipe.addListError'));
    } finally {
      setAddingToList(false);
    }
  }

  async function handleAddSingleIngredient(ingredient: {
    name: string;
    amount?: number | null;
    unit?: string | null;
  }) {
    if (addingToList) return;

    setAddingToList(true);
    try {
      await addItemToList({
        note: ingredient.name,
        amount: ingredient.amount || 1,
        unit: ingredient.unit || 'un',
      });
      Alert.alert(
        t('common.success'),
        t('recipe.addedIngredient', { name: ingredient.name }),
        [
          { text: 'OK' },
          { text: t('recipe.viewList'), onPress: () => router.push('/shopping-list') }
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), t('recipe.addListError'));
    } finally {
      setAddingToList(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">{t('recipe.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 bg-white">
        <View className="items-center justify-center flex-1 px-8">
          <Ionicons name="restaurant-outline" size={64} color={colors.muted} />
          <Text className="mt-4 text-lg font-semibold text-gray-900">{t('recipe.notFound')}</Text>
          <Text className="mt-2 text-center text-gray-600">
            {t('recipe.notFoundDesc')}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 mt-6 rounded-lg bg-primary"
          >
            <Text className="font-semibold text-white">{t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const coverPhoto = recipe.photos?.[0]?.url || 'https://placehold.co/800x500?text=Cookiefy';

  return (
    <View className="flex-1 bg-white">
      {/* Header com foto de capa */}
      <View className="relative">
        <Image
            source={{ uri: coverPhoto }}
            style={{ width: screenWidth, height: 300 }}
            resizeMode="cover"
          />
          
          {/* Overlay com botões */}
          <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between p-4 pt-12">
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center w-10 h-10 rounded-full bg-black/40"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            
            <View className="flex-row gap-3">
              <Pressable
                onPress={toggleFavorite}
                disabled={favoriteLoading}
                className="items-center justify-center w-10 h-10 rounded-full bg-black/40"
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons 
                    name={recipe.isFavorited ? "heart" : "heart-outline"} 
                    size={24} 
                    color={recipe.isFavorited ? "#FF6B6B" : "white"} 
                  />
                )}
              </Pressable>
              
              <Pressable
                onPress={shareRecipe}
                className="items-center justify-center w-10 h-10 rounded-full bg-black/40"
              >
                <Ionicons name="share-outline" size={24} color="white" />
              </Pressable>
              
              <Pressable
                onPress={handleDownloadPdf}
                className="items-center justify-center w-10 h-10 rounded-full bg-black/40"
              >
                <Ionicons name="download-outline" size={22} color="white" />
              </Pressable>
            </View>
          </View>

          {/* Informações sobrepostas na parte inferior */}
          <View className="absolute bottom-0 left-0 right-0">
            {/* Overlay de fundo com gradiente mais escuro */}
            <View 
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                paddingTop: 40,
                paddingBottom: 24,
                paddingHorizontal: 24,
              }}
            >
              <Text 
                className="mb-2 text-2xl font-bold text-white"
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {recipe.title}
              </Text>
              <Text 
                className="mb-4 text-white/95"
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                  lineHeight: 20,
                }}
              >
                {recipe.description}
              </Text>
              
              <View className="flex-row flex-wrap items-center gap-4">
                <View className="flex-row items-center px-3 py-1 rounded-full bg-black/30">
                  <Ionicons name="time-outline" size={16} color="white" />
                  <Text 
                    className="ml-1 text-sm font-medium text-white"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  >
                    {formatDuration(recipe.prepMinutes)} {t('recipe.prep')}
                  </Text>
                </View>
                
                <View className="flex-row items-center px-3 py-1 rounded-full bg-black/30">
                  <Ionicons name="flame-outline" size={16} color="white" />
                  <Text 
                    className="ml-1 text-sm font-medium text-white"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  >
                    {formatDuration(recipe.cookMinutes)} {t('recipe.cook')}
                  </Text>
                </View>
                
                <View className="flex-row items-center px-3 py-1 rounded-full bg-black/30">
                  <Ionicons name="people-outline" size={16} color="white" />
                  <Text 
                    className="ml-1 text-sm font-medium text-white"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.8)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  >
                    {recipe.servings || 'N/A'} {t('recipe.servings')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

      {/* Tabs Navigation */}
      <View className="flex-row bg-white border-b border-gray-200">
        <Pressable
          onPress={() => setSelectedTab('details')}
          className={`flex-1 justify-center items-center py-4 border-b-2 ${
            selectedTab === 'details' ? 'border-primary' : 'border-transparent'
          }`}
        >
          <Text
            className={`font-semibold ${
              selectedTab === 'details' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            {t('recipe.details')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab('reviews')}
          className={`flex-1 justify-center items-center py-4 border-b-2 ${
            selectedTab === 'reviews' ? 'border-primary' : 'border-transparent'
          }`}
        >
          <Text
            className={`font-semibold ${
              selectedTab === 'reviews' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            {t('recipe.reviews')}
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {selectedTab === 'details' ? (
        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Informações do autor */}
            <View className="flex-row items-center mb-6">
              <View className="items-center justify-center w-12 h-12 mr-3 bg-gray-200 rounded-full">
                {(author?.photoUrl || recipe.author?.photoUrl) ? (
                  <Image
                    source={{ uri: (author?.photoUrl || recipe.author?.photoUrl) || '' }}
                    style={{ width: 48, height: 48 }}
                    className="rounded-full"
                  />
                ) : (
                  <Ionicons name="person" size={24} color={colors.muted} />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">
                  {author?.name || recipe.author?.name || 'Chef Cookiefy'}
                </Text>
                <Text className="text-sm text-gray-600">
                  {new Date(recipe.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>

            {/* Dificuldade e categorias */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Text className="mr-3 text-lg font-semibold text-gray-900">{t('recipe.difficulty.label')}:</Text>
                <View 
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: getDifficultyColor(recipe.difficulty) + '20' }}
                >
                  <Text 
                    className="font-medium"
                    style={{ color: getDifficultyColor(recipe.difficulty) }}
                  >
                    {getDifficultyText(recipe.difficulty)}
                  </Text>
                </View>
              </View>
              
              {recipe.categories && recipe.categories.length > 0 && (
                <View className="flex-row flex-wrap">
                  {recipe.categories.map((category) => (
                    <View
                      key={category.id}
                      className="px-3 py-1 mb-2 mr-2 bg-gray-100 rounded-full"
                    >
                      <Text className="text-sm text-gray-700">{category.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Informações nutricionais */}
            {recipe.nutrition && (
              <View className="mb-6">
                <Text className="mb-3 text-lg font-semibold text-gray-900">{t('recipe.nutrition')}</Text>
                <View className="p-4 rounded-lg bg-gray-50">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">{t('recipe.calories')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.calories, ' kcal')}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">{t('recipe.protein')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.protein, 'g')}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">{t('recipe.carbs')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.carbs, 'g')}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">{t('recipe.fat')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.fat, 'g')}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">{t('recipe.fiber')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.fiber, 'g')}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">{t('recipe.sodium')}:</Text>
                    <Text className="font-medium">{formatNutritionValue(recipe.nutrition.sodium, 'mg')}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Ingredientes */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900">{t('recipe.ingredients')}</Text>
                  <Pressable
                    onPress={handleAddAllIngredientsToList}
                    disabled={addingToList}
                    className="flex-row items-center px-4 py-2 rounded-lg bg-primary"
                  >
                    {addingToList ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="cart-outline" size={16} color="white" />
                        <Text className="ml-2 text-sm font-semibold text-white">
                          {t('recipe.addAll')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
                <View className="p-4 rounded-lg bg-gray-50">
                  {recipe.ingredients.map((ingredient, index) => (
                    <View key={index} className="flex-row items-center py-2 border-b border-gray-200 last:border-b-0">
                      <View className="w-2 h-2 mr-3 rounded-full bg-primary" />
                      <Text className="flex-1 text-gray-700">
                        {ingredient.amount && ingredient.unit 
                          ? `${ingredient.amount} ${ingredient.unit} de ${ingredient.name}`
                          : ingredient.name
                        }
                      </Text>
                      <Pressable
                        onPress={() => handleAddSingleIngredient(ingredient)}
                        disabled={addingToList}
                        className="p-2 ml-2 rounded-lg bg-primary/10"
                      >
                        <Ionicons name="add" size={20} color={colors.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Modo de preparo */}
            {recipe.steps && recipe.steps.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900">{t('recipe.preparation')}</Text>
                  <Pressable
                    onPress={() => router.push({
                      pathname: `/recipes/${id}/steps`,
                      params: {
                        steps: JSON.stringify(recipe.steps),
                        title: recipe.title
                      }
                    })}
                    className="flex-row items-center px-4 py-2 rounded-lg bg-primary"
                  >
                    <Ionicons name="play-outline" size={16} color="white" />
                    <Text className="ml-2 font-semibold text-white">{t('recipe.startMode')}</Text>
                  </Pressable>
                </View>
                <View className="space-y-4">
                  {recipe.steps.map((step, index) => (
                    <View key={index} className="flex-row">
                      <View className="items-center justify-center flex-shrink-0 w-8 h-8 mr-4 rounded-full bg-primary">
                        <Text className="text-sm font-semibold text-white">{step.order + 1}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="leading-6 text-gray-700">{step.text}</Text>
                        {step.durationSec && (
                          <Text className="mt-1 text-sm text-gray-500">
                            <Ionicons name="time-outline" size={14} color={colors.muted} />
                            {' '}{Math.floor(step.durationSec / 60)}min
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fotos adicionais */}
            {recipe.photos && recipe.photos.length > 1 && (
              <View className="mb-6">
                <Text className="mb-3 text-lg font-semibold text-gray-900">{t('recipe.morePhotos')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {recipe.photos.slice(1).map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo.url }}
                      style={{ width: 120, height: 120, marginRight: 12 }}
                      className="rounded-lg"
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>

      ) : (
        <ReviewsTab
          recipeId={recipe.id}
          currentUserId={me?.id}
        />
      )}

      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
