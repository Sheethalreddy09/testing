import React, { useState } from 'react';
import { PlatformAdminUser } from '../../../types/platform.types';
import { AVAILABLE_PERMISSIONS } from './CreatePlatformAdminModal';
import { PlatformService } from '../../../services/platform.service';
import { buttonClass, ErrorBox } from '../../../components/platform/OperationsUI';
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
  if (admin.role !== 'PLATFORM_ADMIN') return null;
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
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Admin permissions"
            className="bg-slate-900 rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-auto"
          >
            <h2 className="font-bold mb-3">Permissions for {admin.email}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await PlatformService.write(
                    `admins/${admin.id}`,
                    { permissions: selected },
                    'patch',
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
              <div className="space-y-2">
                {AVAILABLE_PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.key)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.key]
                            : selected.filter((k) => k !== p.key),
                        )
                      }
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {error && <ErrorBox error={error} />}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button className={buttonClass} disabled={busy}>
                  {busy ? 'Saving…' : 'Save permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
