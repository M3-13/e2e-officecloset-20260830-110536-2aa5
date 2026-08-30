import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function describeLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "E-Mail oder Passwort ist falsch.";
    }
    return error.message;
  }
  return "Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.";
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = "Bitte gib deine E-Mail-Adresse ein.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
    }
    if (!password) {
      errors.password = "Bitte gib dein Passwort ein.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/wardrobe", { replace: true });
    } catch (error) {
      setFormError(describeLoginError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page auth-page">
      <h1 className="page__title">Anmelden</h1>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="auth-alert" role="alert">
            {formError}
          </p>
        )}
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            E-Mail
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">
            Passwort
          </label>
          <input
            id="login-password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors.password && (
            <p className="auth-field-error">{fieldErrors.password}</p>
          )}
        </div>
        <button
          className="auth-button auth-button--primary"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Anmeldung läuft…" : "Anmelden"}
        </button>
      </form>
      <p className="auth-switch">
        Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
      </p>
    </div>
  );
}

export default LoginPage;
