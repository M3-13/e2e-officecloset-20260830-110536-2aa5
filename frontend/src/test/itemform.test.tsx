import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MAX_IMAGE_BYTES, validateImageFile } from "../api/images";
import { createItem, deleteItem, getItem } from "../api/items";
import { ItemFormPage } from "../pages/ItemFormPage";

vi.mock("../api/items", () => ({
  createItem: vi.fn(),
  getItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock("../api/images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/images")>();
  return {
    ...actual,
    uploadImage: vi.fn(),
  };
});

import { uploadImage } from "../api/images";

function makeFile(
  name: string,
  type: string,
  size = 1024,
): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function renderForm(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/items/new" element={<ItemFormPage />} />
        <Route path="/items/:id/edit" element={<ItemFormPage />} />
        <Route path="/wardrobe" element={<div>Galerie</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateImageFile", () => {
  it("akzeptiert JPEG, PNG und WebP unter 5 MB", () => {
    expect(validateImageFile(makeFile("a.jpg", "image/jpeg"))).toBeNull();
    expect(validateImageFile(makeFile("a.png", "image/png"))).toBeNull();
    expect(validateImageFile(makeFile("a.webp", "image/webp"))).toBeNull();
  });

  it("akzeptiert gültige Dateiendungen auch ohne MIME-Typ", () => {
    expect(validateImageFile(makeFile("a.png", ""))).toBeNull();
    expect(validateImageFile(makeFile("a.webp", ""))).toBeNull();
  });

  it("weist ein falsches Format ab", () => {
    expect(validateImageFile(makeFile("a.gif", "image/gif"))).toMatch(/JPEG/);
  });

  it("weist eine Datei über 5 MB ab", () => {
    expect(
      validateImageFile(makeFile("big.png", "image/png", MAX_IMAGE_BYTES + 1)),
    ).toMatch(/5 MB/);
  });
});

describe("ItemFormPage (Anlegen)", () => {
  it("rendert das Anlege-Formular mit allen Feldern", () => {
    renderForm("/items/new");

    expect(
      screen.getByRole("heading", { name: "Neues Kleidungsstück" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Kategorie")).toBeInTheDocument();
    expect(screen.getByLabelText("Bild")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("zeigt eine Meldung, wenn der Name fehlt", async () => {
    renderForm("/items/new");

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bitte gib einen Namen ein.",
    );
    expect(createItem).not.toHaveBeenCalled();
  });

  it("zeigt eine Meldung, wenn keine Kategorie gewählt ist", async () => {
    renderForm("/items/new");

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Schwarzes Kleid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bitte wähle eine Kategorie aus.",
    );
    expect(createItem).not.toHaveBeenCalled();
  });

  it("weist ein zu großes Bild ab", async () => {
    renderForm("/items/new");

    const input = screen.getByLabelText("Bild");
    fireEvent.change(input, {
      target: {
        files: [makeFile("big.png", "image/png", MAX_IMAGE_BYTES + 1)],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/5 MB/);
  });

  it("weist ein falsches Bildformat ab", async () => {
    renderForm("/items/new");

    fireEvent.change(screen.getByLabelText("Bild"), {
      target: { files: [makeFile("a.gif", "image/gif")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG/);
  });

  it("legt ein Stück an, lädt das Bild hoch und kehrt zur Garderobe zurück", async () => {
    vi.mocked(createItem).mockResolvedValue({
      id: 7,
      name: "Schwarzes Kleid",
      category: "Kleider",
      image_filename: null,
    });
    vi.mocked(uploadImage).mockResolvedValue({
      id: 7,
      name: "Schwarzes Kleid",
      category: "Kleider",
      image_filename: "7.png",
    });

    renderForm("/items/new");

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Schwarzes Kleid" },
    });
    fireEvent.change(screen.getByLabelText("Kategorie"), {
      target: { value: "Kleider" },
    });
    fireEvent.change(screen.getByLabelText("Bild"), {
      target: { files: [makeFile("dress.png", "image/png")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Galerie")).toBeInTheDocument();
    expect(createItem).toHaveBeenCalledWith({
      name: "Schwarzes Kleid",
      category: "Kleider",
    });
    expect(uploadImage).toHaveBeenCalledWith(7, expect.any(File));
  });

  it("zeigt einen Serverfehler beim Anlegen an", async () => {
    vi.mocked(createItem).mockRejectedValue(new Error("Speichern fehlgeschlagen."));

    renderForm("/items/new");

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Schwarzes Kleid" },
    });
    fireEvent.change(screen.getByLabelText("Kategorie"), {
      target: { value: "Kleider" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Speichern fehlgeschlagen.",
    );
  });
});

describe("ItemFormPage (Bearbeiten)", () => {
  it("lädt das vorhandene Stück und füllt das Formular vor", async () => {
    vi.mocked(getItem).mockResolvedValue({
      id: 3,
      name: "Abendkleid",
      category: "Kleider",
      image_filename: null,
    });

    renderForm("/items/3/edit");

    expect(
      await screen.findByRole("heading", { name: "Kleidungsstück bearbeiten" }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Name")).toHaveValue("Abendkleid");
    expect(await screen.findByLabelText("Kategorie")).toHaveValue("Kleider");
  });

  it("löscht das Stück nach Bestätigung und kehrt zur Garderobe zurück", async () => {
    vi.mocked(getItem).mockResolvedValue({
      id: 3,
      name: "Abendkleid",
      category: "Kleider",
      image_filename: null,
    });
    vi.mocked(deleteItem).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderForm("/items/3/edit");

    fireEvent.click(
      await screen.findByRole("button", { name: "Kleidungsstück löschen" }),
    );

    expect(await screen.findByText("Galerie")).toBeInTheDocument();
    expect(deleteItem).toHaveBeenCalledWith(3);
  });

  it("löscht nicht, wenn die Bestätigung abgebrochen wird", async () => {
    vi.mocked(getItem).mockResolvedValue({
      id: 3,
      name: "Abendkleid",
      category: "Kleider",
      image_filename: null,
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderForm("/items/3/edit");

    fireEvent.click(
      await screen.findByRole("button", { name: "Kleidungsstück löschen" }),
    );

    expect(deleteItem).not.toHaveBeenCalled();
  });
});
