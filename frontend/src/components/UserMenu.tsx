import { Link } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../constants";

export function UserMenu() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    return (
      <Link to="/login" className="user-menu__login">
        Anmelden
      </Link>
    );
  }

  return (
    <button type="button" className="user-menu__button" aria-label="Benutzermenü">
      <span className="user-menu__avatar" aria-hidden="true" />
      <span className="sr-only">Benutzermenü</span>
    </button>
  );
}
