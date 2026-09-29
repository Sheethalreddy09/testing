// ============================================================
// Clyptus Job Portal - Shared Platform Header
// Reusable by both Platform Super Admin and Platform Admin.
// ============================================================

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Bell, Shield } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useResource } from '../../components/platform/OperationsUI';

export const PlatformHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const notifications = useResource(
    'notifications',
    { limit: 1 },
    hasPermission('platform.notifications.read'),
    30000,
  );
  const notificationsCount = notifications.data?.unread || 0;
  const [searchQuery, setSearchQuery] = useState('');

  // Breadcrumbs builder
  const pathSnippets = location.pathname.split('/').filter((i) => i);
  const breadcrumbItems = pathSnippets.map((snippet, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const formatted = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
    return { name: formatted, url };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/platform/organisations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0c1222]/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="hover:text-slate-200 cursor-pointer">Platform</span>
        {breadcrumbItems.map((b, i) => (
          <React.Fragment key={b.url}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span
              className={`${
                i === breadcrumbItems.length - 1
                  ? 'text-indigo-400 font-semibold'
                  : 'hover:text-slate-200'
              }`}
            >
              {b.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search organizations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900/90 border border-slate-700/70 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </form>

        {/* Notifications */}
        <button
          disabled={!hasPermission('platform.notifications.read')}
          onClick={() => navigate('/platform/notifications')}
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
              {notificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
