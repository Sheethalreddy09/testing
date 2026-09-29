import React from 'react';
import { Page, Table, columns } from '../../components/platform/OperationsUI';
export function AuditLogs() {
  return (
    <Page
      title="Audit logs"
      description="Read-only history of organization, token, user, support, moderation, and privileged actions."
    >
      <Table
        path="audit-logs"
        columns={columns('action', 'entityType', 'entityId', 'actorRole', 'createdAt', 'metadata')}
      />
    </Page>
  );
}
