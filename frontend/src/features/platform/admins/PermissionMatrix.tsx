import React, { useState } from "react";
import { AVAILABLE_PERMISSIONS, permissionGroups } from "./permission-labels";
export function PermissionMatrix({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  return (
    <section
      className="permission-matrix"
      aria-label="Admin access permissions"
    >
      <div className="permission-intro">
        <div>
          <h3>Admin permissions</h3>
          <p>
            Choose the actions this Admin can perform. Actions may also require
            access to view their data.
          </p>
        </div>
        <span>
          {AVAILABLE_PERMISSIONS.filter((p) => selected.includes(p.key)).length}{" "}
          enabled
        </span>
      </div>
      <label className="permission-search">
        <span className="sr-only">Find a permission</span>
        <input
          className="field-input"
          placeholder="Find a permission…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="permission-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Permission</th>
              <th scope="col" className="permission-check">
                Allow access
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(permissionGroups).map(([group, title]) => {
              const rows = AVAILABLE_PERMISSIONS.filter(
                (p) =>
                  p.key.split(".")[1] === group &&
                  p.label.toLowerCase().includes(search.toLowerCase()),
              ).sort(
                (a, b) =>
                  Number(b.key.endsWith(".read")) -
                  Number(a.key.endsWith(".read")),
              );
              if (!rows.length) return null;
              return (
                <React.Fragment key={group}>
                  <tr className="permission-group">
                    <th colSpan={2} scope="colgroup">
                      {title}
                    </th>
                  </tr>
                  {rows.map((p) => (
                    <tr key={p.key}>
                      <td>
                        <label htmlFor={`permission-${p.key}`}>{p.label}</label>
                      </td>
                      <td className="permission-check">
                        <input
                          id={`permission-${p.key}`}
                          type="checkbox"
                          disabled={disabled}
                          checked={selected.includes(p.key)}
                          onChange={(e) =>
                            onChange(
                              e.target.checked
                                ? [...new Set([...selected, p.key])]
                                : selected.filter((key) => key !== p.key),
                            )
                          }
                          aria-label={p.label}
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {!AVAILABLE_PERMISSIONS.some((p) =>
              p.label.toLowerCase().includes(search.toLowerCase()),
            ) && (
              <tr>
                <td colSpan={2}>No matching permissions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="permission-reserved">
        Managing Platform Admin accounts and critical platform settings remains
        exclusive to Super Admin.
      </p>
    </section>
  );
}
