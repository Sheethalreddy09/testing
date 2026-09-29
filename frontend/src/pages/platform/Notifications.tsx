import React from 'react';
import { Page, Table, Action, columns } from '../../components/platform/OperationsUI';
export function Notifications() {
  return (
    <Page
      title="Notifications"
      description="Alerts visible to your account and current permissions."
    >
      <Table
        path="notifications"
        filters={{
          category: [
            'PLATFORM',
            'VERIFICATION',
            'MODERATION',
            'TOKEN',
            'PAYMENT',
            'SUPPORT',
            'SECURITY',
          ],
          unread: ['true', 'false'],
        }}
        columns={columns('title', 'category', 'entityId', 'createdAt', 'readAt')}
        actions={(r) =>
          !r.readAt && <Action title="Mark read" path={`notifications/${r.id}/read`} />
        }
      />
    </Page>
  );
}
