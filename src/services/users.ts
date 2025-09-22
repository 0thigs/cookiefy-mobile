import { http } from '../lib/http';

export type User = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  createdAt: string;
};

export async function getUserById(id: string) {
  return http.get<User>(`/users/${id}`);
}
