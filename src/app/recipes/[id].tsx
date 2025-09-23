import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
  Pressable,
  Image,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getRecipeDetail, addFavorite, removeFavorite, type RecipeDetail } from '../../services/recipes';
import { getUserById, type User } from '../../services/users';
import { colors } from '../../theme/colors';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { BottomNavBar } from '../../components/BottomNavBar';

const { width: screenWidth } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useAuth();
  const { handleTabPress } = useNavigation();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

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
      Alert.alert('Erro', 'Não foi possível carregar a receita');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!recipe || favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      if (recipe.isFavorite) {
        await removeFavorite(recipe.id);
        setRecipe(prev => prev ? { ...prev, isFavorite: false } : null);
      } else {
        await addFavorite(recipe.id);
        setRecipe(prev => prev ? { ...prev, isFavorite: true } : null);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível atualizar os favoritos');
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function shareRecipe() {
    if (!recipe) return;
    
    try {
      await Share.share({
        message: `Confira esta receita deliciosa: ${recipe.title}`,
        title: recipe.title,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  }

  function getDifficultyText(difficulty?: string) {
    switch (difficulty) {
      case 'EASY': return 'Fácil';
      case 'MEDIUM': return 'Média';
      case 'HARD': return 'Difícil';
      default: return 'Não informado';
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
    if (!minutes) return 'Não informado';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  function formatNutritionValue(value?: number, unit?: string) {
    if (value === undefined || value === null) return 'N/A';
    return `${value}${unit || ''}`;
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">Carregando receita...</Text>
        </View>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="restaurant-outline" size={64} color={colors.muted} />
          <Text className="mt-4 text-lg font-semibold text-gray-900">Receita não encontrada</Text>
          <Text className="mt-2 text-center text-gray-600">
            A receita que você está procurando não existe ou foi removida.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 mt-6 rounded-lg bg-primary"
          >
            <Text className="font-semibold text-white">Voltar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const coverPhoto = recipe.photos?.[0]?.url || 'https://placehold.co/800x500?text=Cookiefy';

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header com foto de capa */}
        <View className="relative">
          <Image
            source={{ uri: coverPhoto }}
            style={{ width: screenWidth, height: 300 }}
            resizeMode="cover"
          />
          
          {/* Overlay com botões */}
          <View className="absolute top-0 right-0 left-0 flex-row justify-between items-center p-4 pt-12">
            <Pressable
              onPress={() => router.back()}
              className="justify-center items-center w-10 h-10 rounded-full bg-black/40"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            
            <View className="flex-row gap-3">
              <Pressable
                onPress={toggleFavorite}
                disabled={favoriteLoading}
                className="justify-center items-center w-10 h-10 rounded-full bg-black/40"
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons 
                    name={recipe.isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color="white" 
                  />
                )}
              </Pressable>
              
              <Pressable
                onPress={shareRecipe}
                className="justify-center items-center w-10 h-10 rounded-full bg-black/40"
              >
                <Ionicons name="share-outline" size={24} color="white" />
              </Pressable>
            </View>
          </View>

          {/* Informações sobrepostas na parte inferior */}
          <View className="absolute right-0 bottom-0 left-0">
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
              
              <View className="flex-row flex-wrap gap-4 items-center">
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
                    {formatDuration(recipe.prepMinutes)} prep
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
                    {formatDuration(recipe.cookMinutes)} cozimento
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
                    {recipe.servings || 'N/A'} porções
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="p-6">
        {/* Informações do autor */}
        <View className="flex-row items-center mb-6">
          <View className="justify-center items-center mr-3 w-12 h-12 bg-gray-200 rounded-full">
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
            <Text className="mr-3 text-lg font-semibold text-gray-900">Dificuldade:</Text>
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
                  className="px-3 py-1 mr-2 mb-2 bg-gray-100 rounded-full"
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
            <Text className="mb-3 text-lg font-semibold text-gray-900">Informações Nutricionais</Text>
            <View className="p-4 bg-gray-50 rounded-lg">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Calorias:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.calories, ' kcal')}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Proteína:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.protein, 'g')}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Carboidratos:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.carbs, 'g')}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Gorduras:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.fat, 'g')}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Fibra:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.fiber, 'g')}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Sódio:</Text>
                <Text className="font-medium">{formatNutritionValue(recipe.nutrition.sodium, 'mg')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Ingredientes */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Ingredientes</Text>
            <View className="p-4 bg-gray-50 rounded-lg">
              {recipe.ingredients.map((ingredient, index) => (
                <View key={index} className="flex-row items-center py-2 border-b border-gray-200 last:border-b-0">
                  <View className="mr-3 w-2 h-2 rounded-full bg-primary" />
                  <Text className="flex-1 text-gray-700">
                    {ingredient.amount && ingredient.unit 
                      ? `${ingredient.amount} ${ingredient.unit} de ${ingredient.name}`
                      : ingredient.name
                    }
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Modo de preparo */}
        {recipe.steps && recipe.steps.length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-900">Modo de Preparo</Text>
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
                <Text className="ml-2 font-semibold text-white">Modo Passo a Passo</Text>
              </Pressable>
            </View>
            <View className="space-y-4">
              {recipe.steps.map((step, index) => (
                <View key={index} className="flex-row">
                  <View className="flex-shrink-0 justify-center items-center mr-4 w-8 h-8 rounded-full bg-primary">
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
            <Text className="mb-3 text-lg font-semibold text-gray-900">Mais Fotos</Text>
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
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
