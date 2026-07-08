import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";

/**
 * Wraps protected routes. Redirects to /login when unauthenticated,
 * and to /onboarding when authenticated but not yet onboarded.
 */
export function AuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isOnboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/**
 * Inverse guard for auth pages (login/register/etc.) — bounces authenticated
 * users away to the dashboard.
 */
export function GuestGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={isOnboarded ? "/" : "/onboarding"} replace />;
  }

  return <>{children}</>;
}
