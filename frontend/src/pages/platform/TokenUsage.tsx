import React from 'react';
import {
  Page,
  Table,
  Action,
  columns,
  reason,
  Metrics,
  useResource,
  ErrorBox,
} from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export function TokenUsage() {
  const { hasPermission: can } = usePermissions();
  const q = useResource('tokens/balances', { limit: 1 });
  return (
    <Page
      title="Token operations"
      description="Balances, consumption, allocation rules, and ledger reconciliation."
    >
      {q.isError ? <ErrorBox error={q.error} /> : q.data && <Metrics values={q.data.summary} />}
      <Table
        path="tokens/balances"
        columns={columns(
          'organisation',
          'balance',
          'allocatedTokens',
          'consumedTokens',
          'reservedTokens',
        )}
        actions={(r) => (
          <>
            {can('platform.tokens.adjust') && (
              <Action
                title="Adjust tokens"
                path="tokens/adjust"
                body={{ organisationId: r.organisationId }}
                fields={[
                  {
                    name: 'type',
                    options: ['ADJUSTMENT', 'ALLOCATION', 'CONSUMPTION', 'EXPIRATION'],
                  },
                  {
                    name: 'amount',
                    label: 'Signed token amount (negative for debit)',
                    type: 'number',
                  },
                  reason,
                  { name: 'referenceId', required: false },
                ]}
              />
            )}{' '}
            {can('platform.tokens.allocate') && (
              <Action
                title="Allocation rules"
                path={`tokens/organisations/${r.organisationId}/limits`}
                method="patch"
                fields={[
                  { name: 'monthlyMaxAllocation', type: 'number', min: 0 },
                  { name: 'singleTxLimit', type: 'number', min: 0 },
                ]}
              />
            )}
          </>
        )}
      />
      <h2 className="font-semibold">Usage by feature</h2>
      <Table
        path="tokens/features"
        columns={columns('feature', 'consumed', 'transactions')}
        search={false}
      />
      <p className="text-xs text-muted">
        UNSPECIFIED means older ledger entries have no feature attribution.
      </p>
      <h2 className="font-semibold">Reconciliation</h2>
      <p className="text-sm text-muted">
        Compare stored balances with the sum of ledger transactions. Differences require
        investigation; this view never rewrites balances.
      </p>
      <Table
        path="tokens/discrepancies"
        columns={columns('organisation', 'balance', 'ledgerBalance', 'difference')}
      />
      {can('platform.tokens.sales.read') && (
        <>
          <h2 className="font-semibold">Verified token sales and purchase history</h2>
          <Table
            path="tokens/sales"
            columns={columns(
              'referenceId',
              'organisationId',
              'amount',
              'currency',
              'status',
              'createdAt',
            )}
          />
        </>
      )}
    </Page>
  );
}
