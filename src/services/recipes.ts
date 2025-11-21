import { http } from '../lib/http';

export type RecipeBrief = {
  id: string;
  title: string;
  description?: string | null;
  authorId: string;
  author?: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
  createdAt: string; 
  status?: 'DRAFT' | 'PUBLISHED' | 'REJECTED';
  coverUrl?: string | null; 
  isFavorited?: boolean; 
  ingredients?: {
    ingredientId: string;
    name: string;
    amount?: number | null;
    unit?: string | null;
  }[];
  categories?: {
    id: string;
    name: string;
    slug: string;
  }[];
  photos?: {
    url: string;
    order: number;
    alt?: string | null;
  }[];
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
  authorId?: string; 
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
  isFavorited?: boolean;
};

export async function getRecipeDetail(id: string) {
  return http.get<RecipeDetail>(`/recipes/${id}`);
}

export async function listDraftRecipes(params?: { page?: number; pageSize?: number }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return http.get<Paginated<RecipeBrief>>(`/recipes/drafts?${qs.toString()}`);
}

export async function getDraftDetail(id: string) {
  return http.get<RecipeDetail>(`/recipes/drafts/${id}`);
}

export async function addFavorite(recipeId: string) {
  await http.post(`/favorites/${recipeId}`);
}

export async function removeFavorite(recipeId: string) {
  await http.delete(`/favorites/${recipeId}`);
}

export async function getFavorites(params?: {
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
  authorId?: string;
  authorName?: string;
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
    queryParams.sort = 'favorited_desc';
  }

  const qs = new URLSearchParams(queryParams);
  return http.get<Paginated<RecipeBrief & { favoritedAt: string }>>(`/favorites?${qs.toString()}`);
}


export async function getFavoritesStats() {
  return http.get<{
    totalFavorites: number;
    recentFavorites: number;
    mostFavoritedCategory: string;
    averageRating: number;
  }>('/favorites/stats');
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

export async function updateRecipe(id: string, input: {
  title?: string;
  description?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
  nutrition?: Record<string, any> | null;
  steps?: { order: number; text: string; durationSec?: number | null }[] | null;
  photos?: { url: string; alt?: string | null; order?: number }[] | null;
  ingredients?: { ingredientId?: string; name?: string; amount?: number | null; unit?: string | null }[] | null;
  categories?: { categoryId: string }[] | null;
}) {
  return http.patch(`/recipes/${id}`, input);
}
export async function listMyRecipes(params?: { page?: number; pageSize?: number }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return http.get<Paginated<RecipeBrief>>( `/recipes/mine?${qs.toString()}`); 
}

export async function deleteRecipe(id: string) {
  return http.delete( `/recipes/${id}`); 
}

