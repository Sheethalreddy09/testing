// ============================================================
// Clyptus Job Portal - Shared Platform Sidebar
// Reusable by both Platform Super Admin and Platform Admin.
// Navigation links are rendered conditionally based on permissions.
// ============================================================

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Coins,
  TrendingUp,
  ShieldCheck,
  Sliders,
  LogOut,
  Layers,
  FileText,
  Activity,
} from 'lucide-react';
import { Brand } from '../../components/common/Brand';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/auth.store';

export const PlatformSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, hasPermission } = usePermissions();
  const { logout } = useAuthStore();

  const navGroups = [
    {
      label: 'CORE PLATFORM',
      items: [
        { name: 'Dashboard', path: '/platform', icon: LayoutDashboard },
        {
          name: 'Verification',
          path: '/platform/verifications',
          icon: FileText,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Monitoring',
          path: '/platform/monitoring',
          icon: FileText,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Users',
          path: '/platform/users',
          icon: FileText,
          permission: 'platform.users.read',
        },
        {
          name: 'Support',
          path: '/platform/support',
          icon: FileText,
          permission: 'platform.support.read',
        },
        {
          name: 'Notifications',
          path: '/platform/notifications',
          icon: FileText,
          permission: 'platform.notifications.read',
        },
        {
          name: 'Moderation',
          path: '/platform/moderation/jobs',
          icon: FileText,
          permission: 'platform.moderation.read',
        },
        {
          name: 'Reports',
          path: '/platform/reports',
          icon: FileText,
          permission: 'platform.reports.generate',
        },

        {
          name: 'Organisations',
          path: '/platform/organisations',
          icon: Building2,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Platform Admins',
          path: '/platform/admins',
          icon: Users2,
          permission: 'platform.admins.read',
          superAdminOnly: true,
        },
      ],
    },
    {
      label: 'TOKEN SYSTEM',
      items: [
        {
          name: 'Token Plans & Pricing',
          path: '/platform/token-plans',
          icon: Coins,
          permission: 'platform.tokens.read',
        },
        {
          name: 'Ledger Transactions',
          path: '/platform/token-transactions',
          icon: FileText,
          permission: 'platform.tokens.read',
        },
        {
          name: 'Usage & Allocations',
          path: '/platform/token-usage',
          icon: Layers,
          permission: 'platform.tokens.read',
        },
      ],
    },
    {
      label: 'INTELLIGENCE & INSIGHTS',
      items: [
        {
          name: 'Platform Analytics',
          path: '/platform/analytics',
          icon: TrendingUp,
          permission: 'platform.analytics.read',
        },
      ],
    },
    {
      label: 'GOVERNANCE & SECURITY',
      items: [
        {
          name: 'Central Audit Logs',
          path: '/platform/audit-logs',
          icon: Activity,
          permission: 'platform.audit.read',
        },
        {
          name: 'Security & Sessions',
          path: '/platform/security',
          icon: ShieldCheck,
          permission: 'platform.security.read',
        },
        {
          name: 'System Settings',
          path: '/platform/settings',
          icon: Sliders,
          permission: 'platform.settings.read',
          superAdminOnly: true,
        },
      ],
    },
  ];

  return (
    <aside className="platform-sidebar">
      <div className="sidebar-brand"><Brand subtitle={isSuperAdmin ? 'Super Admin' : 'Platform Admin'} /></div>
      <nav aria-label="Platform navigation" className="sidebar-nav">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(item => {
            if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdmin) return false;
            return !item.permission || hasPermission(item.permission);
          });
          if (!visibleItems.length) return null;
          return <div key={group.label} className="sidebar-group">
            <p className="sidebar-label">{group.label}</p>
            <div className="space-y-1">{visibleItems.map(item => {
              const Icon = item.icon;
              const active = item.path === '/platform' ? location.pathname === '/platform' : location.pathname.startsWith(item.path);
              return <NavLink key={item.path} to={item.path} end={item.path === '/platform'} className={`sidebar-link ${active ? 'is-active' : ''}`}><Icon aria-hidden="true" /><span>{item.name}</span></NavLink>;
            })}</div>
          </div>;
        })}
      </nav>
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-strong text-action flex items-center justify-center font-semibold shrink-0">{user?.firstName?.[0] || 'A'}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p><p className="text-xs text-muted">{isSuperAdmin ? 'Super Admin' : 'Platform Admin'}</p></div>
          <button aria-label="Sign out" title="Sign out" className="p-2 rounded-lg text-muted hover:bg-soft" onClick={async () => { await logout(); navigate('/platform/login', { replace: true }); }}><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
  );
};
