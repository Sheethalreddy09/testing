// ============================================================
// Clyptus Job Portal - Shared Platform Portal Routes
// Platform Super Admin and Platform Admin use one route hierarchy.
// ============================================================

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PlatformProtectedRoute } from '../components/auth/PlatformProtectedRoute';
import { PermissionRoute } from '../components/auth/PermissionRoute';
import { PlatformLayout } from '../layouts/platform/PlatformLayout';
import { PlatformLogin } from '../pages/auth/PlatformLogin';
import { Dashboard } from '../pages/platform/Dashboard';
import { Organisations } from '../pages/platform/Organisations';
import { OrganisationDetails } from '../pages/platform/OrganisationDetails';
import { PlatformAdmins } from '../pages/platform/PlatformAdmins';
import { TokenPlans } from '../pages/platform/TokenPlans';
import { TokenTransactions } from '../pages/platform/TokenTransactions';
import { TokenUsage } from '../pages/platform/TokenUsage';
import { Analytics } from '../pages/platform/Analytics';
import { AuditLogs } from '../pages/platform/AuditLogs';
import { Security } from '../pages/platform/Security';
import { Settings } from '../pages/platform/Settings';
import { AccessDenied } from '../pages/platform/AccessDenied';

import { Verification } from '../pages/platform/Verification';
import { Monitoring } from '../pages/platform/Monitoring';
import { Users } from '../pages/platform/Users';
import { Support } from '../pages/platform/Support';
import { Notifications } from '../pages/platform/Notifications';
import { Moderation } from '../pages/platform/Moderation';
import { Reports } from '../pages/platform/Reports';
import { OrganisationInvitation } from '../pages/auth/OrganisationInvitation';

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/organisation-invitation" element={<OrganisationInvitation />} />
    <Route path="/" element={<PlatformLogin key="landing-root" />} />
    <Route path="/platform/login" element={<PlatformLogin key="landing" />} />
    <Route path="/platform/login/admin" element={<PlatformLogin key="admin-login" loginRole="PLATFORM_ADMIN" />} />
    <Route path="/platform/login/super-admin" element={<PlatformLogin key="super-admin-login" loginRole="PLATFORM_SUPER_ADMIN" />} />

    <Route element={<PlatformProtectedRoute />}>
      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="verifications"
          element={
            <PermissionRoute permission="platform.organisations.read">
              <Verification />
            </PermissionRoute>
          }
        />
        <Route
          path="monitoring"
          element={
            <PermissionRoute permission="platform.organisations.read">
              <Monitoring />
            </PermissionRoute>
          }
        />
        <Route
          path="users"
          element={
            <PermissionRoute permission="platform.users.read">
              <Users />
            </PermissionRoute>
          }
        />
        <Route
          path="support"
          element={
            <PermissionRoute permission="platform.support.read">
              <Support />
            </PermissionRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <PermissionRoute permission="platform.notifications.read">
              <Notifications />
            </PermissionRoute>
          }
        />
        <Route
          path="moderation/jobs"
          element={
            <PermissionRoute permission="platform.moderation.read">
              <Moderation />
            </PermissionRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionRoute permission="platform.reports.generate">
              <Reports />
            </PermissionRoute>
          }
        />

        <Route path="access-denied" element={<AccessDenied />} />

        <Route
          path="organisations"
          element={
            <PermissionRoute permission="platform.organisations.read">
              <Organisations />
            </PermissionRoute>
          }
        />
        <Route
          path="organisations/:id"
          element={
            <PermissionRoute permission="platform.organisations.read">
              <OrganisationDetails />
            </PermissionRoute>
          }
        />

        <Route
          path="admins"
          element={
            <PermissionRoute
              allowedRoles={['PLATFORM_SUPER_ADMIN']}
              permission="platform.admins.read"
            >
              <PlatformAdmins />
            </PermissionRoute>
          }
        />

        <Route
          path="token-plans"
          element={
            <PermissionRoute permission="platform.tokens.read">
              <TokenPlans />
            </PermissionRoute>
          }
        />
        <Route
          path="token-transactions"
          element={
            <PermissionRoute permission="platform.tokens.read">
              <TokenTransactions />
            </PermissionRoute>
          }
        />
        <Route
          path="token-usage"
          element={
            <PermissionRoute permission="platform.tokens.read">
              <TokenUsage />
            </PermissionRoute>
          }
        />

        <Route
          path="analytics"
          element={
            <PermissionRoute permission="platform.analytics.read">
              <Analytics />
            </PermissionRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <PermissionRoute permission="platform.audit.read">
              <AuditLogs />
            </PermissionRoute>
          }
        />
        <Route
          path="security"
          element={
            <PermissionRoute permission="platform.security.read">
              <Security />
            </PermissionRoute>
          }
        />
        <Route
          path="settings"
          element={
            <PermissionRoute
              allowedRoles={['PLATFORM_SUPER_ADMIN']}
              permission="platform.settings.read"
            >
              <Settings />
            </PermissionRoute>
          }
        />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/platform" replace />} />
  </Routes>
);
