import React, { useState } from 'react';
import { PlatformService } from '../../services/platform.service';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Page,
  useResource,
  ErrorBox,
  inputClass,
  buttonClass,
  label,
  show,
} from '../../components/platform/OperationsUI';
export function Reports() {
  const { hasPermission: can } = usePermissions();
  const allowed = Object.entries({
    organisations: 'organisations.read',
    users: 'users.read',
    tokens: 'tokens.read',
    moderation: 'moderation.read',
    recruitment: 'jobs.read',
  })
    .filter(([, p]) => can(`platform.${p}`))
    .map(([k]) => k);
  const [kind, setKind] = useState(allowed[0] || ''),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [term, setTerm] = useState(''),
    [error, setError] = useState<any>(),
    [busy, setBusy] = useState(false);
  const params = { page, limit: 20, ...(term ? { search: term } : {}) };
  const q = useResource(`reports/${kind}`, params, !!kind);
  const rows = q.data?.data || [];
  const keys = rows.length
    ? Object.keys(rows[0]).filter(
        (k) => !['metadata', 'passwordHash', 'billingDetails'].includes(k),
      )
    : [];
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const r = await PlatformService.read(`reports/${kind}/export`, params);
      const url = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Reports and exports"
      description="Reports and exports use the same permission checks and filters. CSV downloads contain the displayed page (up to 20 records)."
    >
      {!allowed.length ? (
        <p>No report datasets are assigned to your role.</p>
      ) : (
        <>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(search);
              setPage(1);
            }}
          >
            <select
              aria-label="Report type"
              className={inputClass + ' max-w-xs'}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setPage(1);
              }}
            >
              {allowed.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input
              aria-label="Report search"
              className={inputClass + ' max-w-xs'}
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={buttonClass}>Apply</button>
          </form>
          {q.isPending ? (
            <p>Loading…</p>
          ) : q.isError ? (
            <ErrorBox error={q.error} />
          ) : q.data?.available === false ? (
            <p>{q.data.reason}</p>
          ) : (
            <>
              <div className="overflow-auto border border-line rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {keys.map((k) => (
                        <th className="p-3 text-left" key={k}>
                          {label(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="border-t border-line">
                        {keys.map((k) => (
                          <td className="p-3" key={k}>
                            {show(r[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && <p className="p-5">No records found.</p>}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  className={buttonClass}
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} · {q.data?.meta?.total || 0} records
                </span>
                <button
                  className={buttonClass}
                  disabled={page >= (q.data?.meta?.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
                {can('platform.reports.export') && (
                  <button
                    className={buttonClass}
                    disabled={busy || !rows.length}
                    onClick={download}
                  >
                    {busy ? 'Exporting…' : 'Export this page as CSV'}
                  </button>
                )}
              </div>
            </>
          )}
          {error && <ErrorBox error={error} />}
        </>
      )}
    </Page>
  );
}
