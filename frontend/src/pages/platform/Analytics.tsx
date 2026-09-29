import React, { useState } from 'react';
import { AnalyticsCharts } from '../../features/platform/analytics/AnalyticsCharts';
import {
  Page,
  Metrics,
  useResource,
  ErrorBox,
  inputClass,
} from '../../components/platform/OperationsUI';
export function Analytics() {
  const [timeframe, setTimeframe] = useState('30d');
  const q = useResource('analytics', { timeframe });
  return (
    <Page
      title="Platform analytics"
      description="Shared organization, user, recruitment, token, moderation, and support insights."
    >
      <select
        className={inputClass + ' max-w-xs'}
        aria-label="Timeframe"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
      >
        {['7d', '30d', '90d'].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      {q.isPending ? (
        <p>Loading…</p>
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <Metrics values={q.data.operations.metrics} />
          <p className="text-xs text-slate-400">
            Summary counts are current totals; token volumes use the selected period. Organization
            growth shows the last six months.
          </p>
          <AnalyticsCharts data={q.data} />
          <p>
            {q.data.operations.recruitment.available
              ? 'Recruitment funnel is connected.'
              : q.data.operations.recruitment.reason}
          </p>
        </>
      )}
    </Page>
  );
}
