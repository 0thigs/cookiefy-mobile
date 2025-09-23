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
  difficulty?: string;
  minPrep?: string;
  maxPrep?: string;
  minCook?: string;
  maxCook?: string;
  totalTimeMin?: string;
  totalTimeMax?: string;
  categoryId?: string;
  categorySlug?: string;
  ingredient?: string;
  ingredients?: string;
  maxCalories?: string;
  minProtein?: string;
  maxCarbs?: string;
  maxFat?: string;
  minServings?: string;
  maxServings?: string;
  sort?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value && String(value).trim() !== '' && key !== 'page' && key !== 'pageSize') {
      queryParams[key] = String(value);
    }
  });

  if (!queryParams.sort) {
    queryParams.sort = 'newest';
  }

  const qs = new URLSearchParams(queryParams);
  return http.get<Paginated<RecipeBrief>>(`/recipes?${qs.toString()}`);
}

export type RecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  } | null;
  author?: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
  authorId?: string; // Fallback caso a API retorne apenas o ID
  categories?: {
    id: string;
    name: string;
    slug: string;
  }[];
  ingredients?: {
    name: string;
    amount?: number | null;
    unit?: string | null;
  }[];
  steps?: {
    order: number;
    text: string;
    durationSec?: number | null;
  }[];
  photos?: {
    url: string;
    order: number;
    alt?: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
};

export async function getRecipeDetail(id: string) {
  return http.get<RecipeDetail>(`/recipes/${id}`);
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
