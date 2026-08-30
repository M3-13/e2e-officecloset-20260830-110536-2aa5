import type { Category } from "../constants";
import { apiFetch } from "./client";

export interface WardrobeItem {
  id: number;
  name: string;
  category: Category;
  image_filename: string | null;
}

export async function listItems(): Promise<WardrobeItem[]> {
  return apiFetch<WardrobeItem[]>("/api/wardrobe");
}
