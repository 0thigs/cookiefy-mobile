import { http } from '../lib/http';

export type Category = { id: string; name: string; slug: string };

export async function listCategories() {
  const res = await http.get<{ data: Category[] }>('/categories');
  return res.data;
}
