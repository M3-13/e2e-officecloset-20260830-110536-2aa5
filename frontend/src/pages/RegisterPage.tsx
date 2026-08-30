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

function describeRegisterError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Diese E-Mail-Adresse ist bereits registriert.";
    }
    return error.message;
  }
  return "Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.";
}

export function RegisterPage() {
  const { register } = useAuth();
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
      await register(email.trim(), password);
      navigate("/wardrobe", { replace: true });
    } catch (error) {
      setFormError(describeRegisterError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page auth-page">
      <h1 className="page__title">Registrieren</h1>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="auth-alert" role="alert">
            {formError}
          </p>
        )}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">
            E-Mail
          </label>
          <input
            id="register-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-password">
            Passwort
          </label>
          <input
            id="register-password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
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
          {submitting ? "Registrierung läuft…" : "Registrieren"}
        </button>
      </form>
      <p className="auth-switch">
        Schon ein Konto? <Link to="/login">Jetzt anmelden</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
