import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Page,
  Table,
  Action,
  columns,
  reason,
  useResource,
  ErrorBox,
  Metrics,
} from '../../components/platform/OperationsUI';
export function OrganisationDetails() {
  const { id } = useParams();
  const { hasPermission: can } = usePermissions();
  const [invitation, setInvitation] = useState('');
  const q = useResource(`organisations/${id}`);
  if (q.isPending) return <p>Loading…</p>;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const org = q.data;
  return (
    <Page title={org.name} description={`${org.status} · ${org.contactEmail}`}>
      <Link to="/platform/organisations" className="text-action">
        ← Organizations
      </Link>
      <div className="flex flex-wrap gap-2">
        {can('platform.organisations.update') && (
          <Action
            title="Edit information"
            path={`organisations/${id}`}
            method="patch"
            fields={[
              'name',
              'contactEmail',
              'domain',
              'contactPhone',
              'tier',
              'industry',
              'companySize',
              'website',
            ].map((name) => ({
              name,
              type: name === 'contactEmail' ? 'email' : 'text',
              value: org[name] ?? org.metadata?.[name],
              required: ['name', 'contactEmail'].includes(name),
            }))}
          />
        )}{' '}
        {can('platform.organisations.deactivate') && org.status !== 'ARCHIVED' && (
          <Action title="Deactivate" path={`organisations/${id}/deactivate`} fields={[reason]} />
        )}
      </div>
      <Metrics
        values={{
          members: org.membersCount,
          maxRecruiters: org.maxRecruiters,
          ...(can('platform.tokens.read')
            ? {
                tokenBalance:
                  typeof org.tokenBalance === 'object'
                    ? org.tokenBalance?.balance
                    : org.tokenBalance,
              }
            : {}),
        }}
      />
      {can('platform.organisations.provision') && (
        <section className="space-y-3">
          <h2 className="font-semibold">Initial organization administrator</h2>
          <p className="text-sm text-muted">
            Invite the initial Organization Super Admin. The invite can be accepted after
            verification. Expires in 72 hours.
          </p>
          <Action
            title="Create invitation"
            path={`organisations/${id}/invitations`}
            fields={[{ name: 'email', type: 'email' }]}
            onResult={(r) =>
              setInvitation(`${window.location.origin}/organisation-invitation#${r.token}`)
            }
          />
          {invitation && (
            <div className="p-4 bg-warning-soft rounded-lg break-all">
              <p>
                Copy this private invitation link now and deliver it securely to the intended
                administrator:
              </p>
              <input
                readOnly
                aria-label="Invitation link"
                className="w-full mt-2 bg-canvas p-2"
                value={invitation}
              />
              <button onClick={() => setInvitation('')} className="underline mt-2">
                Dismiss link
              </button>
            </div>
          )}
          <Onboarding id={id!} />
        </section>
      )}
      <h2 className="font-semibold">Verification history</h2>
      <Table
        path={`organisations/${id}/verification`}
        columns={columns('decision', 'previousStatus', 'nextStatus', 'reason', 'createdAt')}
        search={false}
      />
      {can('platform.organisations.members.read') && (
        <>
          <h2 className="font-semibold">Members</h2>
          <Table
            path={`organisations/${id}/members`}
            columns={columns('email', 'firstName', 'role', 'isActive')}
          />
        </>
      )}
      {can('platform.organisations.activity.read') && (
        <>
          <h2 className="font-semibold">Organization activity</h2>
          <Table
            path={`organisations/${id}/activity`}
            columns={columns('action', 'actorRole', 'createdAt')}
            search={false}
          />
        </>
      )}
      {can('platform.jobs.read') && (
        <>
          <h2 className="font-semibold">Organization jobs</h2>
          <Table
            path={`organisations/${id}/jobs`}
            columns={columns('title', 'status', 'createdAt')}
          />
        </>
      )}
      {can('platform.tokens.read') && (
        <>
          <h2 className="font-semibold">Organization token usage by feature</h2>
          <Table
            path="tokens/features"
            params={{ organisationId: id }}
            columns={columns('feature', 'consumed', 'transactions')}
            search={false}
          />
        </>
      )}
      {can('platform.analytics.read') && <Monitor id={id!} />}
    </Page>
  );
}
function Onboarding({ id }: { id: string }) {
  const q = useResource(`organisations/${id}/onboarding`);
  return q.isError ? (
    <ErrorBox error={q.error} />
  ) : (
    <div className="text-sm text-muted">
      {q.data?.owner ? `Owner: ${q.data.owner.email}` : 'Owner not provisioned yet'}
      {q.data?.invitations?.map((r: any) => (
        <p key={r.id}>
          {r.email} ·{' '}
          {r.acceptedAt
            ? 'Accepted'
            : new Date(r.expiresAt) < new Date()
              ? 'Expired'
              : 'Awaiting acceptance'}
        </p>
      ))}
    </div>
  );
}
function Monitor({ id }: { id: string }) {
  const q = useResource(`organisations/${id}/monitoring`);
  return (
    <section>
      <h2 className="font-semibold mb-3">Recruitment monitoring</h2>
      {q.isError ? (
        <ErrorBox error={q.error} />
      ) : q.data?.recruitment.available ? (
        <Metrics
          values={
            q.data.recruitment.metrics || {
              jobs: q.data.recruitment.jobs,
              applications: q.data.recruitment.applications,
              interviews: q.data.recruitment.interviews,
              offers: q.data.recruitment.offers,
            }
          }
        />
      ) : (
        <p className="text-muted">{q.data?.recruitment.reason || 'Loading…'}</p>
      )}
    </section>
  );
}
