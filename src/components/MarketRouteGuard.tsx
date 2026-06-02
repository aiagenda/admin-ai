import { Navigate, useLocation } from "react-router-dom";
import { HU_ONLY_PATHS, HU_PATH_REDIRECTS, isUsMarket } from "@/lib/market";

export function MarketRouteGuard() {
  const { pathname } = useLocation();
  if (!isUsMarket()) return null;
  const redirectTo = HU_PATH_REDIRECTS[pathname];
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  if ((HU_ONLY_PATHS as readonly string[]).includes(pathname)) return <Navigate to="/" replace />;
  if (pathname.startsWith("/invoices")) return <Navigate to="/" replace />;
  return null;
}
