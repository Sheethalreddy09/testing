import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export const PlatformProtectedRoute: React.FC = () => {
  const location = useLocation();
  const { user, isHydrating } = useAuthStore();

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-slate-200 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          Restoring secure platform session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== 'PLATFORM_SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
    return <Navigate to="/platform/access-denied" replace />;
  }

  return <Outlet />;
};
