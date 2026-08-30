const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function redirectToLogin(): void {
  localStorage.removeItem("auth_token");
  window.location.assign("/login");
}

function authHeaders(): Headers {
  const headers = new Headers();
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = authHeaders();
  const isForm = options.body instanceof FormData;

  if (!isForm && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Nicht autorisiert");
  }

  if (!response.ok) {
    let message = `Anfrage fehlgeschlagen (Status ${response.status})`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (body && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Nicht-JSON-Antwort: Standardmeldung beibehalten.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchAuthedImage(itemId: number): Promise<string> {
  const headers = authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/wardrobe/${itemId}/image`, { headers });

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Nicht autorisiert");
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Bildanfrage fehlgeschlagen (Status ${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
