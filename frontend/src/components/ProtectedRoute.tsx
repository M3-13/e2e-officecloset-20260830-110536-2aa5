import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../constants";

export function ProtectedRoute() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
