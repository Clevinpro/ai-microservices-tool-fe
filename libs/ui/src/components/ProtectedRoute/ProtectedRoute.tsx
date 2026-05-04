import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: ReactNode;
  /** Redirect target when not authenticated */
  loginPath?: string;
}

export function ProtectedRoute({
  isAuthenticated,
  children,
  loginPath = '/login',
}: ProtectedRouteProps) {
  const location = useLocation();
  // TODO: token refresh, roles, optional outlet pattern
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  return children;
}
