import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../constants";
import { AccountPage } from "../pages/AccountPage";
import { LegalPage } from "../pages/LegalPage";

const API = "http://localhost:8000";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("LegalPage", () => {
  it("zeigt das Impressum mit Anbieter-Angaben", () => {
    render(<LegalPage kind="impressum" />);

    expect(
      screen.getByRole("heading", { name: "Impressum" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Anbieter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Haftungshinweis" }),
    ).toBeInTheDocument();
  });

  it("zeigt die Datenschutzerklärung", () => {
    render(<LegalPage kind="datenschutz" />);

    expect(
      screen.getByRole("heading", { name: "Datenschutzerklärung" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Speicherdauer und Löschung/)).toBeInTheDocument();
  });
});

describe("Kontolöschung", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("zeigt die E-Mail des Kontos und löscht es nach Bestätigung", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "test-token");

    const fetchMock = vi.fn(
      async (url: string, options?: RequestInit): Promise<Response> => {
        if (url === `${API}/api/auth/me`) {
          return jsonResponse({ id: 1, email: "user@example.com" });
        }
        if (url === `${API}/api/auth/account` && options?.method === "DELETE") {
          return new Response(null, { status: 204 });
        }
        throw new Error(
          `Unerwarteter Request: ${options?.method ?? "GET"} ${url}`,
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/account"]}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<div>Anmeldeseite</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));

    expect(
      screen.getByRole("button", { name: "Endgültig löschen" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    await waitFor(() => {
      expect(screen.getByText("Anmeldeseite")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API}/api/auth/account`,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("bricht die Löschung ab, ohne das Konto zu löschen", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "test-token");

    const fetchMock = vi.fn(
      async (url: string): Promise<Response> => {
        if (url === `${API}/api/auth/me`) {
          return jsonResponse({ id: 1, email: "user@example.com" });
        }
        throw new Error(`Unerwarteter Request: GET ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/account"]}>
        <AccountPage />
      </MemoryRouter>,
    );

    await screen.findByText("user@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(
      screen.queryByRole("button", { name: "Endgültig löschen" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      `${API}/api/auth/account`,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("test-token");
  });
});
