import { http } from '../lib/http';

export interface Review {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ReviewsResponse {
  data: Review[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ReviewAverageResponse {
  averageRating: number;
  totalReviews: number;
}

/**
 * Criar uma avaliação para uma receita
 */
export async function createReview(recipeId: string, input: CreateReviewInput): Promise<Review> {
  const response = await http.post<Review>(`/recipes/${recipeId}/reviews`, input);
  return response;
}

/**
 * Listar avaliações de uma receita (paginado)
 */
export async function listReviews(
  recipeId: string,
  page = 1,
  pageSize = 10
): Promise<ReviewsResponse> {
  const response = await http.get<ReviewsResponse>(
    `/recipes/${recipeId}/reviews?page=${page}&pageSize=${pageSize}`
  );
  return response;
}

/**
 * Obter média de avaliações de uma receita
 */
export async function getReviewAverage(recipeId: string): Promise<ReviewAverageResponse> {
  const response = await http.get<ReviewAverageResponse>(`/recipes/${recipeId}/reviews/average`);
  return response;
}

/**
 * Obter minha avaliação em uma receita (autenticado)
 */
export async function getMyReview(recipeId: string): Promise<Review | null> {
  try {
    const response = await http.get<Review>(`/recipes/${recipeId}/reviews/mine`);
    return response;
  } catch (error: any) {
    // Se não houver review, retorna null
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Atualizar uma avaliação
 */
export async function updateReview(reviewId: string, input: UpdateReviewInput): Promise<Review> {
  const response = await http.put<Review>(`/reviews/${reviewId}`, input);
  return response;
}

/**
 * Deletar uma avaliação
 */
export async function deleteReview(reviewId: string): Promise<void> {
  await http.delete(`/reviews/${reviewId}`);
}
