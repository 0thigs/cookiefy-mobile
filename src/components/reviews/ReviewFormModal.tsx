import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';
import { colors } from '../../theme/colors';
import type { Review } from '../../services/reviews';

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
      Alert.alert('Atenção', 'Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      handleClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar a avaliação');
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
                  {initialReview ? 'Editar Avaliação' : 'Avaliar Receita'}
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
                    Sua nota
                  </Text>
                  <View className="flex-row justify-center py-4">
                    <StarRating
                      rating={rating}
                      onRatingChange={setRating}
                      size={40}
                    />
                  </View>
                  <Text className="text-center text-sm text-gray-600">
                    {rating === 1 && 'Muito ruim'}
                    {rating === 2 && 'Ruim'}
                    {rating === 3 && 'Regular'}
                    {rating === 4 && 'Bom'}
                    {rating === 5 && 'Excelente'}
                  </Text>
                </View>

                {/* Comment */}
                <View className="mb-6">
                  <Text className="mb-2 text-base font-semibold text-gray-900">
                    Comentário <Text className="text-gray-500">(opcional)</Text>
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Conte sobre sua experiência com esta receita..."
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
                    <Text className="font-semibold text-gray-700">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting || rating === 0}
                    className={`flex-1 justify-center items-center py-4 rounded-lg ${
                      submitting || rating === 0 ? 'bg-gray-300' : 'bg-primary'
                    }`}
                  >
                    <Text className="font-semibold text-white">
                      {submitting ? 'Salvando...' : 'Salvar'}
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
