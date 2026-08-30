import { useEffect, useSyncExternalStore } from "react";
import { AUTH_TOKEN_KEY } from "../constants";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../api/auth";
import type { AuthUser } from "../api/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

let state: AuthState = { user: null, status: "anonymous" };
let initialized = false;
const listeners = new Set<() => void>();

function readToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // localStorage nicht verfügbar: Sitzung besteht nur im Speicher weiter.
  }
}

function setState(next: AuthState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthState {
  return state;
}

function init(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  if (!readToken()) {
    setState({ user: null, status: "anonymous" });
    return;
  }

  setState({ user: null, status: "loading" });
  fetchMe()
    .then((user) => {
      setState({ user, status: "authenticated" });
    })
    .catch(() => {
      // Bei 401 entfernt apiFetch den Token und leitet auf /login um.
      // Bei Netzwerkfehlern bleibt der Token erhalten, aber es ist kein Nutzer bekannt.
      setState({ user: null, status: "anonymous" });
    });
}

async function establishSession(email: string, accessToken: string): Promise<void> {
  writeToken(accessToken);
  setState({ user: null, status: "loading" });
  try {
    const user = await fetchMe();
    setState({ user, status: "authenticated" });
  } catch {
    setState({ user: { id: 0, email }, status: "authenticated" });
  }
}

async function login(email: string, password: string): Promise<void> {
  const response = await apiLogin(email, password);
  await establishSession(email, response.access_token);
}

async function register(email: string, password: string): Promise<void> {
  const response = await apiRegister(email, password);
  await establishSession(email, response.access_token);
}

async function logout(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // Serverfehler beim Logout ignorieren: lokal wird die Sitzung immer beendet.
  } finally {
    writeToken(null);
    setState({ user: null, status: "anonymous" });
  }
}

export function useAuth(): AuthContextValue {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    init();
  }, []);

  return {
    user: snapshot.user,
    status: snapshot.status,
    isAuthenticated: snapshot.status === "authenticated",
    login,
    register,
    logout,
  };
}

export function resetAuthForTests(): void {
  initialized = false;
  state = { user: null, status: "anonymous" };
}
