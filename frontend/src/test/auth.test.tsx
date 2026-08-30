import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../constants";
import { ApiError } from "../api/client";
import { resetAuthForTests, useAuth } from "../auth/AuthContext";
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
  vi.unstubAllGlobals();
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

  it("wartet auf den Logout-Request, bevor Token gelöscht und umgeleitet wird", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-123");
    mockedApi.fetchMe.mockResolvedValue({ id: 1, email: "anna@example.com" });

    let resolveLogout!: () => void;
    const logoutRequest = new Promise<void>((resolve) => {
      resolveLogout = resolve;
    });
    mockedApi.logout.mockReturnValue(logoutRequest);

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

    expect(mockedApi.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-123");
    expect(screen.getByText("anna@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Login-Seite")).not.toBeInTheDocument();

    await act(async () => {
      resolveLogout();
    });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(await screen.findByText("Login-Seite")).toBeInTheDocument();
  });
});

describe("logout (API)", () => {
  it("setzt den Logout-Request mit keepalive und Authorization-Header ab", async () => {
    const actualAuth = await vi.importActual<typeof authApi>("../api/auth");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-123");

    await actualAuth.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers },
    ];
    expect(url).toContain("/api/auth/logout");
    expect(options.method).toBe("POST");
    expect(options.keepalive).toBe(true);
    expect(options.headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("wirft bei einem 401 nicht und lässt den lokalen Token unangetastet", async () => {
    const actualAuth = await vi.importActual<typeof authApi>("../api/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Nicht autorisiert" }), { status: 401 }),
      ),
    );
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-123");

    await expect(actualAuth.logout()).resolves.toBeUndefined();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-123");
  });

  it("leert Token und State erst nach Auflösung des keepalive-Requests", async () => {
    const actualAuth = await vi.importActual<typeof authApi>("../api/auth");

    let resolveFetch!: () => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = () => resolve(new Response(null, { status: 204 }));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    mockedApi.logout.mockImplementation(() => actualAuth.logout());
    mockedApi.fetchMe.mockResolvedValue({ id: 1, email: "anna@example.com" });
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-123");

    function Harness() {
      const { user, logout } = useAuth();
      return (
        <button type="button" onClick={() => void logout()}>
          {user ? user.email : "anonymous"}
        </button>
      );
    }

    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

    expect(await screen.findByText("anna@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("tok-123");

    await act(async () => {
      resolveFetch();
    });

    await waitFor(() => {
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});
