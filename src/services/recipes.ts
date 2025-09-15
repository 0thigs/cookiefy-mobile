import { http } from '../lib/http';

export type RecipeBrief = {
  id: string;
  title: string;
  description?: string | null;
  authorId: string;
  createdAt: string; // ISO
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
    // ... demais campos se precisar
  }>(`/recipes/${id}`);
}

export async function addFavorite(recipeId: string) {
  await http.post(`/favorites/${recipeId}`);
}

export async function removeFavorite(recipeId: string) {
  await http.del(`/favorites/${recipeId}`);
}
