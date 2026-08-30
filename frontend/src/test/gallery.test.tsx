import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { listItems, type WardrobeItem } from "../api/wardrobe";
import { WardrobePage } from "../pages/WardrobePage";

vi.mock("../api/wardrobe", () => ({
  listItems: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchAuthedImage: vi.fn().mockResolvedValue("blob:mock-image"),
}));

const mockedListItems = vi.mocked(listItems);

const items: WardrobeItem[] = [
  { id: 1, name: "Rotes Kleid", category: "Kleider", image_filename: "kleid.jpg" },
  { id: 2, name: "Blaue Hose", category: "Hosen", image_filename: "hose.jpg" },
  { id: 3, name: "Weiße Bluse", category: "Oberteile", image_filename: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock-image");
  URL.revokeObjectURL = vi.fn();
  mockedListItems.mockResolvedValue(items);
});

describe("WardrobePage Galerie", () => {
  it("zeigt beim Laden alle eigenen Kleidungsstücke an", async () => {
    render(
      <MemoryRouter>
        <WardrobePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.getByText("Blaue Hose")).toBeInTheDocument();
    expect(screen.getByText("Weiße Bluse")).toBeInTheDocument();
  });

  it("filtert die Galerie nach Kategorie", async () => {
    render(
      <MemoryRouter>
        <WardrobePage />
      </MemoryRouter>,
    );

    await screen.findByText("Rotes Kleid");

    await userEvent.click(screen.getByRole("button", { name: "Kleider" }));

    expect(screen.getByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.queryByText("Blaue Hose")).not.toBeInTheDocument();
    expect(screen.queryByText("Weiße Bluse")).not.toBeInTheDocument();
  });

  it("sucht die Galerie nach Name", async () => {
    render(
      <MemoryRouter>
        <WardrobePage />
      </MemoryRouter>,
    );

    await screen.findByText("Rotes Kleid");

    await userEvent.type(screen.getByRole("searchbox"), "hose");

    expect(screen.getByText("Blaue Hose")).toBeInTheDocument();
    expect(screen.queryByText("Rotes Kleid")).not.toBeInTheDocument();
    expect(screen.queryByText("Weiße Bluse")).not.toBeInTheDocument();
  });

  it("zeigt einen Hinweis, wenn kein Treffer existiert", async () => {
    render(
      <MemoryRouter>
        <WardrobePage />
      </MemoryRouter>,
    );

    await screen.findByText("Rotes Kleid");

    await userEvent.type(screen.getByRole("searchbox"), "gibt-es-nicht");

    expect(await screen.findByText("Keine Treffer")).toBeInTheDocument();
  });
});
