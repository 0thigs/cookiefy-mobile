import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import type { Review } from '../../services/reviews';
import { colors } from '../../theme/colors';
import { StarRating } from './StarRating';

interface ReviewItemProps {
  review: Review;
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewItem({ review, currentUserId, onEdit, onDelete }: ReviewItemProps) {
  const { t } = useTranslation();
  const isMyReview = currentUserId === review.userId;

  function handleDelete() {
    Alert.alert(
      t('reviews.deleteTitle'),
      t('reviews.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(review.id),
        },
      ]
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('time.justNow');
    if (diffInSeconds < 3600) return t('time.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('time.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('time.daysAgo', { count: Math.floor(diffInSeconds / 86400) });

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  return (
    <View className="p-4 mb-3 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="justify-center items-center mr-3 w-10 h-10 bg-gray-200 rounded-full">
            {review.user?.photoUrl ? (
              <Image
                source={{ uri: review.user.photoUrl }}
                style={{ width: 40, height: 40 }}
                className="rounded-full"
              />
            ) : (
              <Ionicons name="person" size={20} color={colors.muted} />
            )}
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-900">
              {review.user?.name || t('common.user')}
            </Text>
            <Text className="text-xs text-gray-500">{formatDate(review.createdAt)}</Text>
          </View>
        </View>

        {isMyReview && (
          <View className="flex-row gap-2">
            <Pressable onPress={() => onEdit?.(review)} className="p-2">
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable onPress={handleDelete} className="p-2">
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Rating */}
      <View className="mb-2">
        <StarRating rating={review.rating} readonly size={18} />
      </View>

      {/* Comment */}
      {review.comment && (
        <Text className="text-gray-700 leading-5">{review.comment}</Text>
      )}
    </View>
  );
}
