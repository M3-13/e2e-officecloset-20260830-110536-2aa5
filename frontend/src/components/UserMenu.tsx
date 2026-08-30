import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

export function UserMenu() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  if (status === "loading") {
    return null;
  }

  if (!user) {
    return (
      <Link to="/login" className="user-menu__login">
        Anmelden
      </Link>
    );
  }

  return (
    <div className="user-menu">
      <span className="user-menu__email" title={user.email}>
        {user.email}
      </span>
      <button
        type="button"
        className="auth-button auth-button--secondary user-menu__logout"
        onClick={handleLogout}
      >
        Abmelden
      </button>
    </div>
  );
}

export default UserMenu;
