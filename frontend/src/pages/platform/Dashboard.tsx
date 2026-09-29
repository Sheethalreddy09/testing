import React from 'react';
import { Page, useResource, ErrorBox, Metrics } from '../../components/platform/OperationsUI';
export function Dashboard() {
  const q = useResource('dashboard');
  return (
    <Page
      title="Platform Dashboard"
      description="Organization health, recruitment, tokens, and operational queues."
    >
      {q.isPending ? (
        <p>Loading…</p>
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <Metrics values={q.data.metrics} />
          <p className="text-xs text-slate-400">
            A dash means the domain is not connected or your role does not permit that dataset.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-800">
              <h2 className="font-semibold">Token sales</h2>
              <p className="mt-2 text-slate-400">
                {q.data.tokenSales.available
                  ? JSON.stringify(q.data.tokenSales.totals)
                  : q.data.tokenSales.reason}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-slate-800">
              <h2 className="font-semibold">Recruitment funnel</h2>
              <p className="mt-2 text-slate-400">
                {q.data.recruitment.available
                  ? 'Recruitment totals shown above'
                  : q.data.recruitment.reason}
              </p>
            </div>
          </div>
          <h2 className="font-semibold">Recent platform activity</h2>
          {q.data.recentActivity.length ? (
            q.data.recentActivity.map((r: any) => (
              <div
                key={r.id}
                className="p-3 rounded-lg bg-slate-900 flex justify-between gap-3 text-sm"
              >
                <span>{r.action.replace(/_/g, ' ')}</span>
                <time className="text-slate-400">{new Date(r.createdAt).toLocaleString()}</time>
              </div>
            ))
          ) : (
            <p className="text-slate-400">No activity available for your permissions.</p>
          )}
        </>
      )}
    </Page>
  );
}
