import React, { useState } from "react";
import { PlatformAdminUser } from "../../../types/platform.types";
import { PermissionMatrix } from "./PermissionMatrix";
import { PlatformService } from "../../../services/platform.service";
import {
  buttonClass,
  secondaryButtonClass,
  ErrorBox,
} from "../../../components/platform/OperationsUI";
export function AdminPermissions({
  admin,
  onSaved,
}: {
  admin: PlatformAdminUser;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState<any>(),
    [busy, setBusy] = useState(false);
  if (admin.role !== "PLATFORM_ADMIN") return null;
  return (
    <>
      <button
        className={buttonClass}
        onClick={() => {
          setSelected(admin.platformAdminProfile?.permissions || []);
          setError(null);
          setOpen(true);
        }}
      >
        Permissions: {admin.email}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-overlay p-4 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Admin permissions"
            className="permission-dialog"
          >
            <p className="eyebrow">Access control</p>
            <h2 className="access-title">Assign Admin permissions</h2>
            <p className="text-muted text-sm mb-5">
              Choose access for {admin.firstName} {admin.lastName} (
              {admin.email}).
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await PlatformService.write(
                    `admins/${admin.id}`,
                    { permissions: selected },
                    "patch",
                  );
                  setOpen(false);
                  onSaved();
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <PermissionMatrix
                selected={selected}
                onChange={setSelected}
                disabled={busy}
              />
              {error && <ErrorBox error={error} />}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button className={buttonClass} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
