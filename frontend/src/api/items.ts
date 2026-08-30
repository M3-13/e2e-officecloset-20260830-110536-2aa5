import { apiFetch } from "./client";

export interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  image_filename: string | null;
}

export interface WardrobeItemInput {
  name: string;
  category: string;
}

export function createItem(input: WardrobeItemInput): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>("/api/wardrobe", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getItem(id: number): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>(`/api/wardrobe/${id}`);
}

export function updateItem(
  id: number,
  input: WardrobeItemInput,
): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>(`/api/wardrobe/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: number): Promise<void> {
  return apiFetch<void>(`/api/wardrobe/${id}`, { method: "DELETE" });
}
