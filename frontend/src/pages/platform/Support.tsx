import React, { useState } from 'react';
import {
  Page,
  Table,
  Action,
  columns,
  buttonClass,
  useResource,
  ErrorBox,
} from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export function Support() {
  const { hasPermission: can } = usePermissions();
  const [selected, setSelected] = useState('');
  return (
    <Page
      title="Support operations"
      description="Track user and organization issues, responses, and escalation."
    >
      {can('platform.support.manage') && (
        <Action
          title="Create support case"
          path="support"
          fields={[
            { name: 'subject', minLength: 3 },
            { name: 'description', minLength: 5 },
            { name: 'requesterId', label: 'Requester user ID' },
            { name: 'organisationId', label: 'Organization ID', required: false },
            { name: 'priority', options: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL'] },
          ]}
        />
      )}
      <Table
        path="support"
        filters={{ status: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] }}
        columns={columns('subject', 'priority', 'status', 'requesterId', 'updatedAt')}
        actions={(r) => (
          <>
            <button className={buttonClass} onClick={() => setSelected(r.id)}>
              Details
            </button>
            {can('platform.support.manage') && (
              <Action
                title="Update"
                path={`support/${r.id}`}
                method="patch"
                fields={[
                  {
                    name: 'status',
                    options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
                    value: r.status === 'ESCALATED' ? 'IN_PROGRESS' : r.status,
                  },
                  { name: 'assignedToId', required: false, label: 'Assign to platform user ID' },
                  { name: 'message', minLength: 5 },
                ]}
              />
            )}{' '}
            {can('platform.support.escalate') && r.status !== 'ESCALATED' && (
              <Action
                title="Escalate"
                path={`support/${r.id}`}
                method="patch"
                body={{ status: 'ESCALATED' }}
                fields={[{ name: 'message', label: 'Escalation reason', minLength: 5 }]}
              />
            )}
          </>
        )}
      />
      {selected && <SupportDetail id={selected} />}
    </Page>
  );
}
function SupportDetail({ id }: { id: string }) {
  const q = useResource(`support/${id}`);
  return (
    <section className="bg-surface p-5 rounded-xl space-y-3">
      {q.isError ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <h2 className="font-semibold">{q.data?.subject || 'Loading…'}</h2>
          <p>{q.data?.description}</p>
          {q.data?.activities.map((a: any) => (
            <div key={a.id} className="border-t border-line-strong pt-3">
              <p>{a.message}</p>
              <small className="text-muted">
                {a.actorId} · {a.nextStatus} · {new Date(a.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
