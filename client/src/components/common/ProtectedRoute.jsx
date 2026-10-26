import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStudent } from "@/context/StudentContext";

export default function ProtectedRoute() {
  const location = useLocation();
  const { flags, authReady } = useStudent();

  if (!authReady) return null;
  if (!flags.authenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
