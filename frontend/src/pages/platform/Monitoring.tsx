import React from 'react';
import { Link } from 'react-router-dom';
import { Page, Table, columns } from '../../components/platform/OperationsUI';
export function Monitoring() {
  return (
    <Page
      title="Organization monitoring"
      description="Open an organization to inspect recruitment, onboarding, members, activity, and permitted token data."
    >
      <Table
        path="organisations"
        columns={[
          {
            key: 'name',
            render: (r) => (
              <Link className="underline text-action" to={`/platform/organisations/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          ...columns('status', 'membersCount', 'tier'),
        ]}
      />
    </Page>
  );
}
