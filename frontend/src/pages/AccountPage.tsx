import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount, fetchAccount } from "../api/account";
import { ApiError } from "../api/client";
import { AUTH_TOKEN_KEY } from "../constants";

const baseButton: CSSProperties = {
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "var(--radius-md)",
  minHeight: 44,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};

const dangerButton: CSSProperties = {
  ...baseButton,
  background: "var(--color-danger)",
  color: "#16120e",
};

const secondaryButton: CSSProperties = {
  ...baseButton,
  background: "transparent",
  border: "1px solid var(--color-border)",
  color: "var(--color-fg)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 20,
  margin: "var(--space-5) 0 var(--space-2)",
};

const mutedStyle: CSSProperties = {
  color: "var(--color-muted)",
};

const errorStyle: CSSProperties = {
  color: "var(--color-danger)",
};

const confirmBoxStyle: CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-4)",
  maxWidth: 480,
};

const actionsRowStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  justifyContent: "flex-end",
};

export function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const account = await fetchAccount();
        if (!cancelled) {
          setEmail(account.email);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Das Konto konnte nicht geladen werden.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleting(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "Das Konto konnte nicht gelöscht werden.",
      );
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Konto</h1>

      <section>
        <h2 style={sectionTitleStyle}>E-Mail-Adresse</h2>
        {loading ? (
          <p style={mutedStyle}>Konto wird geladen …</p>
        ) : email !== null ? (
          <p>{email}</p>
        ) : (
          <p style={errorStyle}>
            {error ?? "Das Konto konnte nicht geladen werden."}
          </p>
        )}
      </section>

      <section>
        <h2 style={sectionTitleStyle}>Konto löschen</h2>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={dangerButton}
          >
            Konto löschen
          </button>
        ) : (
          <div style={confirmBoxStyle}>
            <p>
              Möchtest du dein Konto wirklich löschen? Dabei werden deine
              Kleidungsstücke und hochgeladenen Bilder dauerhaft entfernt.
            </p>
            {error && <p style={errorStyle}>{error}</p>}
            <div style={actionsRowStyle}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                style={secondaryButton}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={dangerButton}
              >
                {deleting ? "Wird gelöscht …" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default AccountPage;
