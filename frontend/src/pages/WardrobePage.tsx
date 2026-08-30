import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listItems, type WardrobeItem } from "../api/wardrobe";
import { AuthedImage } from "../components/AuthedImage";
import { CATEGORIES, type Category } from "../constants";
import "../styles/wardrobe.css";

type CategoryFilter = Category | "all";

export function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    listItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Die Garderobe konnte nicht geladen werden.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesSearch =
        query.length === 0 || item.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  return (
    <div className="gallery">
      <div className="gallery__header">
        <h1 className="gallery__title">Garderobe</h1>
        <Link to="/items/new" className="gallery__new">
          Neues Stück
        </Link>
      </div>

      {error && (
        <div className="gallery__error" role="alert">
          {error}
        </div>
      )}

      <div className="gallery__toolbar">
        <div className="gallery__search">
          <label className="sr-only" htmlFor="wardrobe-search">
            Nach Name suchen
          </label>
          <input
            id="wardrobe-search"
            type="search"
            className="gallery__search-input"
            placeholder="Nach Name suchen…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div
          className="gallery__filters"
          role="group"
          aria-label="Nach Kategorie filtern"
        >
          <button
            type="button"
            className={
              categoryFilter === "all"
                ? "filter-chip filter-chip--active"
                : "filter-chip"
            }
            aria-pressed={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          >
            Alle
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={
                categoryFilter === category
                  ? "filter-chip filter-chip--active"
                  : "filter-chip"
              }
              aria-pressed={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="gallery__loading">Lade Garderobe…</p>
      ) : items.length === 0 ? (
        <div className="gallery-empty">
          <p className="gallery-empty__title">Noch keine Kleidungsstücke</p>
          <p className="gallery-empty__text">
            Lege dein erstes Stück an, um deine Garderobe zu füllen.
          </p>
          <Link to="/items/new" className="gallery__new">
            Neues Stück
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="gallery-empty">
          <p className="gallery-empty__title">Keine Treffer</p>
          <p className="gallery-empty__text">
            Kein Kleidungsstück passt zu deiner Suche oder dem gewählten Filter.
          </p>
        </div>
      ) : (
        <ul className="gallery__grid">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <Link
                to={`/items/${item.id}/edit`}
                className="gallery-card"
              >
                <div className="gallery-card__image">
                  <span className="gallery-card__placeholder" aria-hidden="true">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                  {item.image_filename !== null && (
                    <AuthedImage
                      itemId={item.id}
                      alt={item.name}
                      className="gallery-card__img"
                    />
                  )}
                </div>
                <div className="gallery-card__body">
                  <h2 className="gallery-card__name">{item.name}</h2>
                  <p className="gallery-card__category">{item.category}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WardrobePage;
