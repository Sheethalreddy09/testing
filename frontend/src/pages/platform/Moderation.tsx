import React from 'react';
import { Page, Table, Action, columns, reason } from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export function Moderation() {
  const { hasPermission: can } = usePermissions();
  return (
    <Page
      title="Job moderation"
      description="Search shared job postings, investigate reports, and record moderation decisions."
    >
      {can('platform.jobs.read') && (
        <Table
          path="moderation/jobs"
          filters={{ status: ['FLAGGED', 'REPORTED', 'ACTIVE', 'RESTRICTED', 'SUSPENDED'] }}
          columns={columns('id', 'title', 'organisationId', 'status', 'reportsCount')}
          actions={(r) => (
            <>
              {can('platform.jobs.moderate') && (
                <Action
                  title="Moderate"
                  path={`moderation/jobs/${r.id}/actions`}
                  fields={[{ name: 'action', options: ['APPROVE', 'RESTRICT', 'RESTORE'] }, reason]}
                />
              )}{' '}
              {can('platform.jobs.suspend') && (
                <Action
                  title="Suspend posting"
                  path={`moderation/jobs/${r.id}/actions`}
                  body={{ action: 'SUSPEND' }}
                  fields={[reason]}
                />
              )}
            </>
          )}
        />
      )}
      <h2 className="font-semibold">Moderation history</h2>
      <Table
        path="moderation/history"
        columns={columns('jobId', 'organisationId', 'actorId', 'action', 'reason', 'createdAt')}
      />
    </Page>
  );
}
