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

export async function deleteAccount() {
  // Deleta a conta do usuário autenticado. O endpoint esperado é DELETE /users/me
  // Retorna void ou lança em caso de erro.
  await http.delete('/users/me');
}

export async function updateUser(input: { name?: string; email?: string; photoUrl?: string | null }) {
  // Atualiza os dados do usuário autenticado. Endpoint esperado: PATCH /users/me
  return http.patch<User>('/users/me', input);
}
