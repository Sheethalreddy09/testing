import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import {
  activityLabel,
  actorLabel,
  targetLabel,
} from "../../features/platform/audit/activity";
import {
  Page,
  useResource,
  ErrorBox,
  Metrics,
} from "../../components/platform/OperationsUI";
export function Dashboard() {
  const q = useResource("dashboard");
  const { hasPermission } = usePermissions();
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
          <p className="text-xs text-muted">
            A dash means the domain is not connected or your role does not
            permit that dataset.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-line">
              <h2 className="font-semibold">Token sales</h2>
              <p className="mt-2 text-muted">
                {q.data.tokenSales.available
                  ? JSON.stringify(q.data.tokenSales.totals)
                  : q.data.tokenSales.reason}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-line">
              <h2 className="font-semibold">Recruitment funnel</h2>
              <p className="mt-2 text-muted">
                {q.data.recruitment.available
                  ? "Recruitment totals shown above"
                  : q.data.recruitment.reason}
              </p>
            </div>
          </div>
          <section
            className="recent-activity"
            aria-labelledby="recent-activity-title"
          >
            <div className="activity-heading">
              <div>
                <h2 id="recent-activity-title">Recent platform activity</h2>
                <p className="text-sm text-muted">
                  Latest 5 events. Full history is available in Audit logs.
                </p>
              </div>
              {hasPermission("platform.audit.read") && (
                <Link to="/platform/audit-logs" className="text-link">
                  View all activity <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
            {q.data.recentActivity.length ? (
              <ul className="activity-list">
                {q.data.recentActivity.slice(0, 5).map((row: any) => (
                  <li key={row.id}>
                    <div>
                      <strong>{activityLabel(row.action)}</strong>
                      <p>
                        {actorLabel(row)} · {targetLabel(row)}
                      </p>
                    </div>
                    <time dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-4">
                No activity available for your permissions.
              </p>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
