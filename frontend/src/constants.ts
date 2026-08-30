export const CATEGORIES = [
  "Oberteile",
  "Hosen",
  "Kleider",
  "Schuhe",
  "Accessoires",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const AUTH_TOKEN_KEY = "auth_token";
