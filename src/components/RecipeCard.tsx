import { memo, useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addFavorite, removeFavorite, RecipeBrief } from '../services/recipes';

type Props = {
  recipe: RecipeBrief & { _cover?: string | null }; // _cover = resolvido via detalhe
};

export const RecipeCard = memo(function RecipeCard({ recipe }: Props) {
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const cover =
    recipe._cover ?? recipe.coverUrl ?? 'https://placehold.co/800x500?text=Cookiefy';

  async function toggleFav() {
    if (busy) return;
    setBusy(true);
    const next = !fav;
    setFav(next);
    try {
      if (next) await addFavorite(recipe.id);
      else await removeFavorite(recipe.id);
    } catch {
      // rollback
      setFav(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="overflow-hidden mb-6 rounded-2xl">
      <View className="relative">
        <Image
          source={{ uri: cover }}
          style={{ width: '100%', height: 240 }}
          resizeMode="cover"
        />
        <Pressable
          onPress={toggleFav}
          className="absolute top-4 right-4 justify-center items-center w-12 h-12 rounded-full bg-black/40"
        >
          <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color="#fff" />
        </Pressable>

        {/* Overlay escuro para legibilidade do texto */}
        <View
          className="absolute right-0 bottom-0 left-0 px-5 py-5"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Text className="mb-2 text-xl font-semibold text-white">{recipe.title}</Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text className="ml-2 text-base font-medium text-white">TESTE</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
