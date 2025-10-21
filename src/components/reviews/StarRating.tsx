import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ rating, onRatingChange, size = 24, readonly = false }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View className="flex-row">
      {stars.map((star) => {
        const filled = star <= rating;
        
        if (readonly) {
          return (
            <Ionicons
              key={star}
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#F59E0B' : colors.muted}
              style={{ marginRight: 4 }}
            />
          );
        }

        return (
          <Pressable key={star} onPress={() => onRatingChange?.(star)}>
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#F59E0B' : colors.muted}
              style={{ marginRight: 4 }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
