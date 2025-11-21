import { http } from '../lib/http';
import type { Paginated, RecipeBrief } from './recipes';

export async function listPendingRecipes(page = 1) {
  return http.get<Paginated<RecipeBrief>>(`/admin/recipes/pending?page=${page}`);
}

export async function listAllRecipesAdmin(page = 1, q = '') {
  const qs = new URLSearchParams({ page: String(page), q });
  return http.get<Paginated<RecipeBrief>>(`/admin/recipes?${qs.toString()}`);
}

export async function moderateRecipe(id: string, status: 'PUBLISHED' | 'REJECTED', reason?: string) {
  return http.patch(`/admin/recipes/${id}/moderate`, { status, reason });
}
