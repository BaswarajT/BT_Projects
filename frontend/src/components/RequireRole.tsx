import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export default function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
