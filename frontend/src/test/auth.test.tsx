import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../constants";
import { ApiError } from "../api/client";
import { resetAuthForTests } from "../auth/AuthContext";
import { UserMenu } from "../components/UserMenu";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import * as authApi from "../api/auth";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

const mockedApi = vi.mocked(authApi);

beforeEach(() => {
  localStorage.clear();
  resetAuthForTests();
  vi.resetAllMocks();
});

describe("LoginPage", () => {
  it("meldet an, speichert den Token und leitet in die Garderobe weiter", async () => {
    mockedApi.login.mockResolvedValue({ access_token: "tok-123", token_type: "bearer" });
    mockedApi.fetchMe.mockResolvedValue({ id: 1, email: "anna@example.com" });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/wardrobe" element={<div>Garderobe-Inhalt</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/E-Mail/i), "anna@example.com");
    await userEvent.type(screen.getByLabelText(/Passwort/i), "geheim123");
    await userEvent.click(screen.getByRole("button", { name: /Anmelden/i }));

    await waitFor(() => {
      expect(screen.getByText("Garderobe-Inhalt")).toBeInTheDocument();
    });

    expect(mockedApi.login).toHaveBeenCalledWith("anna@example.com", "geheim123");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-123");
  });

  it("zeigt bei falschen Anmeldedaten eine verständliche Meldung", async () => {
    mockedApi.login.mockRejectedValue(
      new ApiError(401, "E-Mail oder Passwort ist falsch."),
    );

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/E-Mail/i), "anna@example.com");
    await userEvent.type(screen.getByLabelText(/Passwort/i), "falsch");
    await userEvent.click(screen.getByRole("button", { name: /Anmelden/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-Mail oder Passwort ist falsch.",
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("validiert leere Felder clientseitig, ohne die API aufzurufen", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: /Anmelden/i }));

    expect(
      await screen.findByText("Bitte gib deine E-Mail-Adresse ein."),
    ).toBeInTheDocument();
    expect(screen.getByText("Bitte gib dein Passwort ein.")).toBeInTheDocument();
    expect(mockedApi.login).not.toHaveBeenCalled();
  });
});

describe("RegisterPage", () => {
  it("registriert, speichert den Token und leitet in die Garderobe weiter", async () => {
    mockedApi.register.mockResolvedValue({ access_token: "tok-456", token_type: "bearer" });
    mockedApi.fetchMe.mockResolvedValue({ id: 2, email: "bob@example.com" });

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/wardrobe" element={<div>Garderobe-Inhalt</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/E-Mail/i), "bob@example.com");
    await userEvent.type(screen.getByLabelText(/Passwort/i), "geheim123");
    await userEvent.click(screen.getByRole("button", { name: /Registrieren/i }));

    await waitFor(() => {
      expect(screen.getByText("Garderobe-Inhalt")).toBeInTheDocument();
    });

    expect(mockedApi.register).toHaveBeenCalledWith("bob@example.com", "geheim123");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-456");
  });

  it("zeigt bei bereits vergebener E-Mail eine verständliche Meldung", async () => {
    mockedApi.register.mockRejectedValue(
      new ApiError(409, "Diese E-Mail-Adresse ist bereits registriert."),
    );

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/E-Mail/i), "anna@example.com");
    await userEvent.type(screen.getByLabelText(/Passwort/i), "geheim123");
    await userEvent.click(screen.getByRole("button", { name: /Registrieren/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Diese E-Mail-Adresse ist bereits registriert.",
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});

describe("UserMenu", () => {
  it("zeigt ohne Token den Anmelde-Link", () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Anmelden" })).toBeInTheDocument();
  });

  it("zeigt die E-Mail und meldet ab, wobei der Token entfernt wird", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-123");
    mockedApi.fetchMe.mockResolvedValue({ id: 1, email: "anna@example.com" });
    mockedApi.logout.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/wardrobe"]}>
        <Routes>
          <Route path="/wardrobe" element={<UserMenu />} />
          <Route path="/login" element={<div>Login-Seite</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("anna@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Abmelden/i }));

    await waitFor(() => {
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });
    expect(mockedApi.logout).toHaveBeenCalled();
    expect(await screen.findByText("Login-Seite")).toBeInTheDocument();
  });
});
