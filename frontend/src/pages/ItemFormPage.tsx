import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CATEGORIES, type Category } from "../constants";
import {
  createItem,
  deleteItem,
  getItem,
  updateItem,
  type WardrobeItemInput,
} from "../api/items";
import { uploadImage, validateImageFile } from "../api/images";
import { AuthedImage } from "../components/AuthedImage";
import "./itemform.css";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;
  const itemId = id !== undefined ? Number(id) : null;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasExistingImage, setHasExistingImage] = useState(false);

  useEffect(() => {
    if (!isEdit || itemId === null) {
      return;
    }
    let cancelled = false;
    getItem(itemId)
      .then((item) => {
        if (cancelled) {
          return;
        }
        setName(item.name);
        setCategory(item.category as Category);
        setHasExistingImage(item.image_filename !== null);
      })
      .catch((error) => {
        if (!cancelled) {
          setFormError(
            errorMessage(error, "Das Kleidungsstück konnte nicht geladen werden."),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, itemId]);

  function onFileChange(next: File | null): void {
    setFileError(null);
    if (!next) {
      setFile(null);
      return;
    }
    const error = validateImageFile(next);
    if (error) {
      setFile(null);
      setFileError(error);
      return;
    }
    setFile(next);
  }

  function validate(): boolean {
    if (!name.trim()) {
      setFormError("Bitte gib einen Namen ein.");
      return false;
    }
    if (!category) {
      setFormError("Bitte wähle eine Kategorie aus.");
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const input: WardrobeItemInput = { name: name.trim(), category };
      const saved =
        isEdit && itemId !== null
          ? await updateItem(itemId, input)
          : await createItem(input);
      if (file) {
        await uploadImage(saved.id, file);
      }
      navigate("/wardrobe");
    } catch (error) {
      setFormError(errorMessage(error, "Speichern ist fehlgeschlagen."));
      setLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (itemId === null) {
      return;
    }
    if (
      !window.confirm(
        "Möchtest du dieses Kleidungsstück wirklich löschen?",
      )
    ) {
      return;
    }
    setDeleting(true);
    setFormError(null);
    try {
      await deleteItem(itemId);
      navigate("/wardrobe");
    } catch (error) {
      setFormError(errorMessage(error, "Löschen ist fehlgeschlagen."));
      setDeleting(false);
    }
  }

  const title = isEdit ? "Kleidungsstück bearbeiten" : "Neues Kleidungsstück";

  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>

      <form className="item-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="item-form__alert" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="item-form__field">
          <label className="item-form__label" htmlFor="item-name">
            Name
          </label>
          <input
            id="item-name"
            className="item-form__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Schwarzes Abendkleid"
          />
        </div>

        <div className="item-form__field">
          <label className="item-form__label" htmlFor="item-category">
            Kategorie
          </label>
          <select
            id="item-category"
            className="item-form__input"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as Category | "")
            }
          >
            <option value="" disabled>
              Bitte wählen …
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="item-form__field">
          <label className="item-form__label" htmlFor="item-image">
            {isEdit ? "Neues Bild (optional)" : "Bild"}
          </label>
          <input
            id="item-image"
            className="item-form__file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              onFileChange(event.target.files?.[0] ?? null)
            }
          />
          <p className="item-form__hint">
            Erlaubt: JPEG, PNG oder WebP, maximal 5 MB.
          </p>
          {fileError ? (
            <p className="item-form__error" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>

        {isEdit && itemId !== null && hasExistingImage ? (
          <div className="item-form__field">
            <span className="item-form__label">Aktuelles Bild</span>
            <AuthedImage
              itemId={itemId}
              alt="Aktuelles Bild"
              className="item-form__preview"
            />
          </div>
        ) : null}

        <div className="item-form__actions">
          <button
            className="item-form__button item-form__button--primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Speichern …" : "Speichern"}
          </button>
          <Link
            className="item-form__button item-form__button--secondary"
            to="/wardrobe"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {isEdit && itemId !== null ? (
        <button
          className="item-form__delete"
          type="button"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Löschen …" : "Kleidungsstück löschen"}
        </button>
      ) : null}
    </div>
  );
}

export default ItemFormPage;
