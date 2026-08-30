import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AUTH_TOKEN_KEY } from "../constants";
import App from "../App";

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("App-Shell", () => {
  it("rendert die Navigationsleiste mit allen Links", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Garderobe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impressum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Datenschutz" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Konto" })).toBeInTheDocument();
  });

  it("rendert die Login-Seite unter /login", async () => {
    window.history.pushState({}, "", "/login");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Anmelden" }),
    ).toBeInTheDocument();
  });

  it("rendert die Registrierungs-Seite unter /register", async () => {
    window.history.pushState({}, "", "/register");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Registrieren" }),
    ).toBeInTheDocument();
  });

  it("leitet ohne Token von einer geschützten Route auf /login um", async () => {
    window.history.pushState({}, "", "/wardrobe");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Anmelden" }),
    ).toBeInTheDocument();
  });

  it("rendert die Garderobe mit vorhandenem Token", async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "test-token");
    window.history.pushState({}, "", "/wardrobe");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Garderobe" }),
    ).toBeInTheDocument();
  });
});
