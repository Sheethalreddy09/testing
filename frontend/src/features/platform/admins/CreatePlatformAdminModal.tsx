// ============================================================
// Clyptus Job Portal - Create Platform Admin Modal
// Enforces granular permission assignment for platform admins.
// Strictly prevents elevation to PLATFORM_SUPER_ADMIN.
// ============================================================

import React, { useState } from "react";
import { X, Users2 } from "lucide-react";

import { PermissionMatrix } from "./PermissionMatrix";
export { AVAILABLE_PERMISSIONS } from "./permission-labels";

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

export const CreatePlatformAdminModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "Operations",
    permissions: ["platform.organisations.read", "platform.audit.read"],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Platform Admin Account"
        className="w-full max-w-4xl p-6 bg-surface border border-line rounded-2xl shadow-none space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-action" />
            <div>
              <p className="eyebrow">Access control</p>
              <h3 className="access-title">Create Platform Admin</h3>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close create Admin"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="create-admin-firstName"
                className="text-[11px] font-semibold text-ink"
              >
                First Name *
              </label>
              <input
                type="text"
                required
                id="create-admin-firstName"
                disabled={isSubmitting}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="Sarah"
                className="w-full px-3 py-1.5 bg-soft border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="create-admin-lastName"
                className="text-[11px] font-semibold text-ink"
              >
                Last Name *
              </label>
              <input
                type="text"
                required
                id="create-admin-lastName"
                disabled={isSubmitting}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Connor"
                className="w-full px-3 py-1.5 bg-soft border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="create-admin-email"
              className="text-[11px] font-semibold text-ink"
            >
              Work Email *
            </label>
            <input
              type="email"
              required
              id="create-admin-email"
              disabled={isSubmitting}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="sarah.c@platform.clyptus.com"
              className="w-full px-3 py-1.5 bg-soft border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-brand font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="create-admin-password"
                className="text-[11px] font-semibold text-ink"
              >
                Initial Password *
              </label>
              <input
                type="password"
                required
                id="create-admin-password"
                disabled={isSubmitting}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••••••"
                className="w-full px-3 py-1.5 bg-soft border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="create-admin-department"
                className="text-[11px] font-semibold text-ink"
              >
                Department
              </label>
              <input
                type="text"
                id="create-admin-department"
                disabled={isSubmitting}
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="Operations"
                className="w-full px-3 py-1.5 bg-soft border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <PermissionMatrix
            selected={formData.permissions}
            onChange={(permissions) =>
              setFormData({ ...formData, permissions })
            }
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-action hover:bg-action-hover text-on-action rounded-lg text-xs font-semibold shadow-none  transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Creating Admin..." : "Create Platform Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
