import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';
import {
    createReview,
    deleteReview,
    getMyReview,
    getReviewAverage,
    listReviews,
    updateReview,
    type Review,
} from '../../services/reviews';
import { colors } from '../../theme/colors';
import { ReviewFormModal } from './ReviewFormModal';
import { ReviewItem } from './ReviewItem';
import { StarRating } from './StarRating';

interface ReviewsTabProps {
  recipeId: string;
  currentUserId?: string;
}

export function ReviewsTab({ recipeId, currentUserId }: ReviewsTabProps) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    loadData();
  }, [recipeId]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([
        loadReviews(1, false),
        loadAverage(),
        loadMyReview(),
      ]);
    } catch (error: any) {
      console.error('Erro ao carregar avaliações:', error);
      Alert.alert(t('common.error'), t('reviews.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews(pageNum: number, append: boolean) {
    try {
      const response = await listReviews(recipeId, pageNum, 10);
      
      if (append) {
        setReviews((prev) => [...prev, ...response.data]);
      } else {
        setReviews(response.data);
      }
      
      setPage(pageNum);
      setHasMore(response.data.length === 10);
    } catch (error) {
      throw error;
    }
  }

  async function loadAverage() {
    try {
      const response = await getReviewAverage(recipeId);
      setAverageRating(response.averageRating);
      setTotalReviews(response.totalReviews);
    } catch (error) {
      console.error('Erro ao carregar média:', error);
    }
  }

  async function loadMyReview() {
    if (!currentUserId) return;
    
    try {
      const response = await getMyReview(recipeId);
      setMyReview(response);
    } catch (error) {
      console.error('Erro ao carregar minha avaliação:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await loadReviews(page + 1, true);
    } catch (error) {
      console.error('Erro ao carregar mais avaliações:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleOpenModal(review?: Review) {
    setEditingReview(review || null);
    setShowModal(true);
  }

  async function handleSubmitReview(rating: number, comment: string) {
    try {
      if (editingReview) {
        // Atualizar review existente
        const updated = await updateReview(editingReview.id, { rating, comment });
        setMyReview(updated);
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } else {
        // Criar nova review
        const created = await createReview(recipeId, { rating, comment });
        setMyReview(created);
        setReviews((prev) => [created, ...prev]);
      }
      
      // Recarregar média
      await loadAverage();
    } catch (error) {
      throw error;
    }
  }

  async function handleDeleteReview(reviewId: string) {
    try {
      await deleteReview(reviewId);
      setMyReview(null);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      await loadAverage();
      Alert.alert(t('common.success'), t('reviews.deleteSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), t('reviews.deleteError'));
    }
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 py-12">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-gray-600">{t('reviews.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewItem
            review={item}
            currentUserId={currentUserId}
            onEdit={handleOpenModal}
            onDelete={handleDeleteReview}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Summary Card */}
            <View className="p-6 mb-4 bg-white border border-gray-200 rounded-lg">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Text className="mr-2 text-4xl font-bold text-gray-900">
                      {averageRating != null ? averageRating.toFixed(1) : '0'}
                    </Text>
                    <View>
                      <StarRating rating={Math.round(averageRating)} readonly size={20} />
                      <Text className="mt-1 text-xs text-gray-600">
                        {totalReviews} {totalReviews === 1 ? t('reviews.review') : t('reviews.reviews')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Button to add/edit review */}
                {currentUserId && (
                  <Pressable
                    onPress={() => handleOpenModal(myReview || undefined)}
                    className="flex-row items-center px-4 py-3 rounded-lg bg-primary"
                  >
                    <Ionicons
                      name={myReview ? 'create-outline' : 'add-outline'}
                      size={20}
                      color="white"
                    />
                    <Text className="ml-2 font-semibold text-white">
                      {myReview ? t('common.edit') : t('reviews.rate')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Reviews list header */}
            {reviews.length > 0 && (
              <Text className="px-6 mb-3 text-lg font-semibold text-gray-900">
                {t('reviews.title', { count: totalReviews })}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center px-6 py-12">
            <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
            <Text className="mt-4 text-lg font-semibold text-gray-900">
              {t('reviews.emptyTitle')}
            </Text>
            <Text className="mt-2 text-center text-gray-600">
              {t('reviews.emptyDesc')}
            </Text>
            {currentUserId && (
              <Pressable
                onPress={() => handleOpenModal()}
                className="px-6 py-3 mt-6 rounded-lg bg-primary"
              >
                <Text className="font-semibold text-white">{t('reviews.rateRecipe')}</Text>
              </Pressable>
            )}
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* Modal de formulário */}
      <ReviewFormModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingReview(null);
        }}
        onSubmit={handleSubmitReview}
        initialReview={editingReview}
      />
    </View>
  );
}
