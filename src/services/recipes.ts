import { http } from '../lib/http';

export type RecipeBrief = {
  id: string;
  title: string;
  description?: string | null;
  authorId: string;
  createdAt: string; 
  coverUrl?: string | null; // pode não vir do server ainda (fallback buscado no detalhe)
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
};

export async function listPublicRecipes(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  ingredient?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort: 'newest',
    ...(params?.q ? { q: params.q } : {}),
    ...(params?.ingredient ? { ingredient: params.ingredient } : {}),
  });
  return http.get<Paginated<RecipeBrief>>(`/recipes?${qs.toString()}`);
}

export async function getRecipeDetail(id: string) {
  return http.get<{
    id: string;
    photos: { url: string; order: number; alt?: string | null }[];
    title: string;
    description?: string | null;
  }>(`/recipes/${id}`);
}

export async function addFavorite(recipeId: string) {
  await http.post(`/favorites/${recipeId}`);
}

export async function removeFavorite(recipeId: string) {
  await http.delete(`/favorites/${recipeId}`);
}

export async function createRecipe(input: {
  title: string;
  description?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  nutrition?: Record<string, any>;
  steps?: { order: number; text: string; durationSec?: number | null }[];
  photos?: { url: string; alt?: string | null; order?: number }[];
  ingredients?: { ingredientId?: string; name?: string; amount?: number | null; unit?: string | null }[];
  categories?: { categoryId: string }[];
}) {
  return http.post<{
    id: string;
    title: string;
    description?: string | null;
    authorId: string;
    createdAt: string;
  }>('/recipes', input);
}

export async function publishRecipe(id: string) {
  await http.post(`/recipes/${id}/publish`);
}
