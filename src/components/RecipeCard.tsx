import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { addFavorite, RecipeBrief, removeFavorite } from '../services/recipes';

type Props = {
  recipe: RecipeBrief & { _cover?: string | null };
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
};

export const RecipeCard = memo(function RecipeCard({ recipe, onFavoriteToggle }: Props) {
  const [fav, setFav] = useState(recipe.isFavorited || false);
  const [busy, setBusy] = useState(false);
  const cover =
    recipe._cover ?? recipe.coverUrl ?? 'https://placehold.co/800x500?text=Cookiefy';

  // Sincroniza o estado local com as props quando mudam
  React.useEffect(() => {
    setFav(recipe.isFavorited || false);
  }, [recipe.isFavorited]);

  async function toggleFav() {
    if (busy) return;
    setBusy(true);
    const next = !fav;
    setFav(next);
    try {
      if (next) await addFavorite(recipe.id);
      else await removeFavorite(recipe.id);
      
      // Notifica o componente pai sobre a mudança
      onFavoriteToggle?.(recipe.id, next);
    } catch {
      setFav(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable 
      className="overflow-hidden mb-6 rounded-2xl"
      onPress={() => router.push(`/recipes/${recipe.id}`)}
    >
      <View className="relative">
        <Image
          source={{ uri: cover }}
          style={{ width: '100%', height: 240 }}
          resizeMode="cover"
        />
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggleFav();
          }}
          className="absolute top-4 right-4 justify-center items-center w-12 h-12 rounded-full bg-black/40"
        >
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color="#fff" />
        </Pressable>

        <View
          className="absolute right-0 bottom-0 left-0 px-5 py-5"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Text className="mb-2 text-xl font-semibold text-white">{recipe.title}</Text>
          {recipe.author?.name && (
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={16} color="#fff" />
              <Text className="ml-2 text-base font-medium text-white">{recipe.author.name}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
