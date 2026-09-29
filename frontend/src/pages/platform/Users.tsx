import React, { useState } from 'react';
import {
  Page,
  Table,
  Action,
  columns,
  reason,
  buttonClass,
} from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export function Users() {
  const { hasPermission: can } = usePermissions();
  const [selected, setSelected] = useState('');
  return (
    <Page
      title="User administration"
      description="Candidate and organization accounts. Platform administrator privileges are managed separately."
    >
      <Table
        path="users"
        filters={{
          role: ['CANDIDATE', 'RECRUITER', 'ORGANISATION_ADMIN', 'ORGANISATION_SUPER_ADMIN'],
          status: ['ACTIVE', 'SUSPENDED'],
        }}
        columns={columns('email', 'firstName', 'lastName', 'role', 'isActive', 'organisationId')}
        actions={(r) => (
          <>
            {can(`platform.users.${r.isActive ? 'suspend' : 'reactivate'}`) && (
              <Action
                title={r.isActive ? 'Suspend' : 'Reactivate'}
                path={`users/${r.id}/${r.isActive ? 'suspend' : 'reactivate'}`}
                fields={[reason]}
              />
            )}{' '}
            {can('platform.users.activity.read') && (
              <button className={buttonClass} onClick={() => setSelected(r.id)}>
                Activity
              </button>
            )}
          </>
        )}
      />
      {selected && (
        <>
          <h2>Account activity</h2>
          <Table
            key={selected}
            path={`users/${selected}/activity`}
            columns={columns('action', 'actorRole', 'createdAt')}
            search={false}
          />
        </>
      )}
    </Page>
  );
}
