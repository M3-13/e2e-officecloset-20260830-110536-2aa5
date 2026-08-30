import { ApiError, apiFetch } from "./client";
import { AUTH_TOKEN_KEY } from "../constants";

const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

interface ErrorBody {
  detail?: unknown;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Anfrage fehlgeschlagen (Status ${response.status})`;
  try {
    const body = (await response.json()) as ErrorBody;
    if (body && typeof body.detail === "string" && body.detail.length > 0) {
      message = body.detail;
    }
  } catch {
    // Nicht-JSON-Antwort: Standardmeldung beibehalten.
  }
  return new ApiError(response.status, message);
}

async function requestAuth(
  path: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as AuthResponse;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return requestAuth("/api/auth/register", email, password);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return requestAuth("/api/auth/login", email, password);
}

export async function logout(): Promise<void> {
  const headers = new Headers();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    // Normaler Fetch OHNE keepalive: keepalive weist den Browser an, die
    // Antwort zu verwerfen und die Verbindung beim Seitenwechsel abzubrechen,
    // wodurch `await fetch(...)` auflöst, bevor die 204-Antwort verarbeitet
    // ist. Ohne keepalive wird die Antwort vollständig abgewartet.
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers,
    });

    // Response-Status prüfen: 204/erfolgreich ist ok. Ein Fehler wird nur
    // lokal abgefangen (KEIN Hard-Redirect via window.location), damit der
    // lokale Logout immer sauber durchläuft.
    if (!response.ok) {
      throw await toApiError(response);
    }
  } catch {
    // Fehler beim Logout lokal abfangen: die lokale Sitzung wird trotzdem beendet.
  }
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me");
}
