import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { UserMenu } from "./components/UserMenu";
import { AccountPage } from "./pages/AccountPage";
import { ItemFormPage } from "./pages/ItemFormPage";
import { LegalPage } from "./pages/LegalPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WardrobePage } from "./pages/WardrobePage";

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? "nav__link nav__link--active" : "nav__link";

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          Kleiderschrank
        </Link>
        <nav className="nav" aria-label="Hauptnavigation">
          <NavLink to="/wardrobe" className={navLinkClass}>
            Garderobe
          </NavLink>
          <NavLink to="/impressum" className={navLinkClass}>
            Impressum
          </NavLink>
          <NavLink to="/datenschutz" className={navLinkClass}>
            Datenschutz
          </NavLink>
          <NavLink to="/account" className={navLinkClass}>
            Konto
          </NavLink>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/wardrobe" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/impressum" element={<LegalPage kind="impressum" />} />
            <Route path="/datenschutz" element={<LegalPage kind="datenschutz" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/wardrobe" element={<WardrobePage />} />
              <Route path="/items/new" element={<ItemFormPage />} />
              <Route path="/items/:id/edit" element={<ItemFormPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
