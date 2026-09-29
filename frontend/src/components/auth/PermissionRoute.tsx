import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { UserRole } from '../../types/platform.types';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: string;
  allowedRoles?: UserRole[];
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  allowedRoles,
}) => {
  const { user, hasPermission } = usePermissions();

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/platform/access-denied" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/platform/access-denied" replace />;
  }

  return <>{children}</>;
};
