import { apiFetch } from "./client";
import type { WardrobeItem } from "./items";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function hasAcceptedType(file: File): boolean {
  if (file.type && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_IMAGE_EXTENSIONS.includes(ext);
}

export function validateImageFile(file: File): string | null {
  if (!hasAcceptedType(file)) {
    return "Bitte wähle ein Bild im Format JPEG, PNG oder WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Das Bild darf höchstens 5 MB groß sein.";
  }
  return null;
}

export async function uploadImage(
  itemId: number,
  file: File,
): Promise<WardrobeItem> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<WardrobeItem>(`/api/wardrobe/${itemId}/image`, {
    method: "POST",
    body: form,
  });
}
