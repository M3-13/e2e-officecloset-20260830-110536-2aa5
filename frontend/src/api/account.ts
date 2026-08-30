import { apiFetch } from "./client";

export interface Account {
  id: number;
  email: string;
}

export async function fetchAccount(): Promise<Account> {
  return apiFetch<Account>("/api/auth/me");
}

export async function deleteAccount(): Promise<void> {
  await apiFetch<void>("/api/auth/account", { method: "DELETE" });
}
