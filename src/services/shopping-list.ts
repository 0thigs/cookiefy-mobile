import { http } from '../lib/http';

export type ShoppingListItem = {
  id: string;
  ingredientId?: string | null;
  recipeId?: string | null;
  note?: string | null;
  amount: number;
  unit: string;
  isChecked: boolean;
  ingredient?: {
    id: string;
    name: string;
  };
  recipe?: {
    id: string;
    title: string;
  };
};

export type ShoppingList = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListResponse = {
  list: ShoppingList;
  items: ShoppingListItem[];
};

// Obter lista de compras
export async function getShoppingList() {
  return http.get<ShoppingListResponse>('/shopping-list');
}

// Adicionar item manual à lista
export async function addItemToList(data: {
  ingredientId?: string;
  recipeId?: string;
  note?: string;
  amount: number;
  unit: string;
}) {
  return http.post<ShoppingListItem>('/shopping-list/items', data);
}

// Atualizar item da lista
export async function updateItem(
  itemId: string,
  data: {
    note?: string;
    amount?: number;
    unit?: string;
    isChecked?: boolean;
  }
) {
  return http.patch<ShoppingListItem>(`/shopping-list/items/${itemId}`, data);
}

// Marcar/desmarcar item
export async function toggleItemChecked(itemId: string) {
  return http.post<{ id: string; isChecked: boolean }>(
    `/shopping-list/items/${itemId}/toggle`,
    {}
  );
}

// Deletar item específico
export async function deleteItem(itemId: string) {
  return http.delete(`/shopping-list/items/${itemId}`);
}

// Limpar itens marcados
export async function clearCheckedItems() {
  return http.delete('/shopping-list/items/checked');
}

// Adicionar todos ingredientes de uma receita
export async function addRecipeToList(recipeId: string) {
  return http.post<{ count: number }>(`/shopping-list/recipes/${recipeId}`, {});
}
