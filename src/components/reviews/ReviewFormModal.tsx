import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import type { Review } from '../../services/reviews';
import { colors } from '../../theme/colors';
import { StarRating } from './StarRating';

interface ReviewFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  initialReview?: Review | null;
}

export function ReviewFormModal({
  visible,
  onClose,
  onSubmit,
  initialReview,
}: ReviewFormModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(initialReview?.rating || 5);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    if (!submitting) {
      setRating(initialReview?.rating || 5);
      setComment(initialReview?.comment || '');
      onClose();
    }
  }

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert(t('common.attention'), t('reviews.selectRating'));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      handleClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('reviews.saveError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleClose}
        >
          <Pressable
            className="bg-white rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView className="max-h-[80vh]">
              {/* Header */}
              <View className="flex-row justify-between items-center p-6 border-b border-gray-200">
                <Text className="text-xl font-bold text-gray-900">
                  {initialReview ? t('reviews.editReview') : t('reviews.rateRecipe')}
                </Text>
                <Pressable onPress={handleClose} disabled={submitting}>
                  <Ionicons name="close" size={28} color={colors.muted} />
                </Pressable>
              </View>

              {/* Form */}
              <View className="p-6">
                {/* Rating */}
                <View className="mb-6">
                  <Text className="mb-3 text-base font-semibold text-gray-900">
                    {t('reviews.yourRating')}
                  </Text>
                  <View className="flex-row justify-center py-4">
                    <StarRating
                      rating={rating}
                      onRatingChange={setRating}
                      size={40}
                    />
                  </View>
                  <Text className="text-center text-sm text-gray-600">
                    {rating === 1 && t('reviews.veryBad')}
                    {rating === 2 && t('reviews.bad')}
                    {rating === 3 && t('reviews.regular')}
                    {rating === 4 && t('reviews.good')}
                    {rating === 5 && t('reviews.excellent')}
                  </Text>
                </View>

                {/* Comment */}
                <View className="mb-6">
                  <Text className="mb-2 text-base font-semibold text-gray-900">
                    {t('reviews.comment')} <Text className="text-gray-500">{t('common.optional')}</Text>
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t('reviews.commentPlaceholder')}
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                    className="p-4 min-h-[120px] text-gray-900 bg-gray-50 rounded-lg border border-gray-200"
                    editable={!submitting}
                  />
                  <Text className="mt-1 text-xs text-right text-gray-500">
                    {comment.length}/500
                  </Text>
                </View>

                {/* Buttons */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleClose}
                    disabled={submitting}
                    className="flex-1 justify-center items-center py-4 bg-gray-100 rounded-lg"
                  >
                    <Text className="font-semibold text-gray-700">{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting || rating === 0}
                    className={`flex-1 justify-center items-center py-4 rounded-lg ${
                      submitting || rating === 0 ? 'bg-gray-300' : 'bg-primary'
                    }`}
                  >
                    <Text className="font-semibold text-white">
                      {submitting ? t('common.saving') : t('common.save')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
