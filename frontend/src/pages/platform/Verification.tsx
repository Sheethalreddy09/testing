import React from 'react';
import { Link } from 'react-router-dom';
import { Page, Table, Action, columns, reason } from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export function Verification() {
  const { hasPermission: can } = usePermissions();
  return (
    <Page
      title="Organization verification"
      description="Approval, rejection, and requests for more information are recorded separately from reactivation."
    >
      <Table
        path="verifications"
        filters={{ status: ['PENDING_VERIFICATION', 'MORE_INFORMATION_REQUIRED', 'REJECTED'] }}
        columns={[
          {
            key: 'name',
            render: (r) => (
              <Link className="text-indigo-300 underline" to={`/platform/organisations/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          ...columns('contactEmail', 'status'),
        ]}
        actions={(r) => (
          <>
            {can('platform.organisations.verify') && (
              <>
                <Action
                  title="Approve"
                  path={`organisations/${r.id}/verification`}
                  body={{ decision: 'APPROVE' }}
                  fields={[reason]}
                />
                <Action
                  title="Request information"
                  path={`organisations/${r.id}/verification`}
                  body={{ decision: 'REQUEST_INFORMATION' }}
                  fields={[reason]}
                />
              </>
            )}
            {can('platform.organisations.reject') && (
              <Action
                title="Reject"
                path={`organisations/${r.id}/verification`}
                body={{ decision: 'REJECT' }}
                fields={[reason]}
              />
            )}
          </>
        )}
      />
    </Page>
  );
}
