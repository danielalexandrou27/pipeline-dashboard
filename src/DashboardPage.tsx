import { useMemo, useState } from 'react';
import { useDashboard, type Connection } from './useDashboard';
import { BatchTable, type SfGroup } from './BatchTable';
import { STATUS_LABEL, clock, longDate, zoneShort } from './format';
import { groupOf, type Counts, type Dashboard, type Group, type Row } from './types';

interface Props {
  onSignedOut: () => void;
  onSignOut: () => void;
}

export function DashboardPage({ onSignedOut, onSignOut }: Props) {
  const { data, error, connection } = useDashboard(onSignedOut);
  const [group, setGroup] = useState<Group>('all');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => (data ? groupRows(data.rows) : []), [data]);
  const unregistered = useMemo(() => (data ? groupRows(data.unregistered) : []), [data]);
  const visible = useMemo(() => filter(groups, group, query), [groups, group, query]);
  const visibleUnregistered = useMemo(() => filter(unregistered, group, query), [unregistered, group, query]);

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-title">
          <h1>Nightly batch</h1>
          {data && (
            <p className="masthead-day">
              {longDate(data.date)}
              <span className="masthead-note">
                Batch day starts at midnight {zoneShort(data.timeZone, data.generatedAt)}
              </span>
            </p>
          )}
        </div>
        <div className="masthead-side">
          <LiveState connection={connection} data={data} />
          <button type="button" className="quiet-button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      {error && (
        <p className="banner" role="alert">
          Can't reach the monitoring engine: {error} The page keeps retrying; check the engine is running.
        </p>
      )}

      {!data ? (
        !error && <p className="loading">Loading tonight's batch…</p>
      ) : (
        <>
          <BatchStrip groups={groups} active={group} onPick={setGroup} />
          <Summary counts={data.counts} active={group} onPick={setGroup} />

          <div className="toolbar">
            <label className="search">
              <span className="visually-hidden">Find a pipeline, workflow or step function</span>
              <input
                type="search"
                placeholder="Find a pipeline, workflow or step function"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {(group !== 'all' || query) && (
              <button type="button" className="quiet-button" onClick={() => { setGroup('all'); setQuery(''); }}>
                Show everything
              </button>
            )}
          </div>

          {visible.length > 0 ? (
            <BatchTable groups={visible} data={data} withWorkflow />
          ) : (
            <p className="empty">
              {groups.length === 0
                ? 'No step functions are registered yet. Add them to pipelines.yml in the engine and they appear here within a minute.'
                : 'No step functions match. Choose Show everything to clear the filter.'}
            </p>
          )}

          {visibleUnregistered.length > 0 && (
            <section className="unregistered" aria-labelledby="unregistered-heading">
              <h2 id="unregistered-heading">Not in the registry</h2>
              <p className="section-note">
                These step functions ran today but aren't listed in pipelines.yml, so they have no upstream linked
                and no due time. Add them to the registry to track them above.
              </p>
              <BatchTable groups={visibleUnregistered} data={data} withWorkflow={false} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LiveState({ connection, data }: { connection: Connection; data: Dashboard | null }) {
  const text = connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting' : 'Reconnecting';
  return (
    <p className={`live live-${connection}`} aria-live="polite">
      <span className="live-dot" aria-hidden="true" />
      {text}
      {data && <span className="live-time">updated {clock(data.generatedAt, data.timeZone)}</span>}
    </p>
  );
}

/** One segment per registered step function, in severity order: the whole night in one line. */
function BatchStrip({ groups, active, onPick }: { groups: SfGroup[]; active: Group; onPick: (g: Group) => void }) {
  if (groups.length === 0) return null;
  return (
    <div className="strip" role="img"
         aria-label={`${groups.length} step functions: ` + summarize(groups)}>
      {groups.map((g) => {
        const sf = g.rows[0].stepFunction;
        const gr = groupOf(sf.status);
        return (
          <span
            key={g.key}
            className={`strip-seg s-${gr}${active !== 'all' && active !== gr ? ' dim' : ''}`}
            title={`${sf.name}: ${STATUS_LABEL[sf.status]}`}
            onClick={() => onPick(active === gr ? 'all' : gr)}
          />
        );
      })}
    </div>
  );
}

const SUMMARY: { group: Exclude<Group, 'all'>; label: string; key: keyof Counts }[] = [
  { group: 'failed', label: 'Failed', key: 'failed' },
  { group: 'late', label: 'Late', key: 'late' },
  { group: 'running', label: 'Running', key: 'running' },
  { group: 'notRun', label: 'Not run yet', key: 'notRun' },
  { group: 'succeeded', label: 'Succeeded', key: 'succeeded' },
];

function Summary({ counts, active, onPick }: { counts: Counts; active: Group; onPick: (g: Group) => void }) {
  return (
    <nav className="summary" aria-label="Filter by status">
      <button type="button" className={`count c-all${active === 'all' ? ' on' : ''}`} aria-pressed={active === 'all'}
              onClick={() => onPick('all')}>
        <span className="count-n">{counts.total}</span>
        <span className="count-label">Step functions</span>
      </button>
      {SUMMARY.map((s) => (
        <button key={s.group} type="button"
                className={`count c-${s.group}${active === s.group ? ' on' : ''}${counts[s.key] === 0 ? ' zero' : ''}`}
                aria-pressed={active === s.group}
                onClick={() => onPick(active === s.group ? 'all' : s.group)}>
          <span className="count-n">{counts[s.key]}</span>
          <span className="count-label">{s.label}</span>
        </button>
      ))}
      {counts.unregistered > 0 && (
        <a className="count c-unregistered" href="#unregistered-heading">
          <span className="count-n">{counts.unregistered}</span>
          <span className="count-label">Not in registry</span>
        </a>
      )}
    </nav>
  );
}

/** Rows arrive sorted with a step function's links adjacent; group them so the step function shows once. */
function groupRows(rows: Row[]): SfGroup[] {
  const out: SfGroup[] = [];
  for (const r of rows) {
    const key = `${r.pipeline ?? ''}|${r.stepFunction.name}`;
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else out.push({ key, rows: [r] });
  }
  return out;
}

function filter(groups: SfGroup[], group: Group, query: string): SfGroup[] {
  const q = query.trim().toLowerCase();
  return groups.filter((g) => {
    const sf = g.rows[0].stepFunction;
    if (group !== 'all' && groupOf(sf.status) !== group) return false;
    if (!q) return true;
    return g.rows.some((r) =>
      [r.pipeline, sf.name, r.upstream?.name, r.upstream?.folder, sf.incident?.number]
        .some((v) => v?.toLowerCase().includes(q)));
  });
}

function summarize(groups: SfGroup[]): string {
  const n: Record<string, number> = {};
  for (const g of groups) {
    const label = STATUS_LABEL[g.rows[0].stepFunction.status].toLowerCase();
    n[label] = (n[label] ?? 0) + 1;
  }
  return Object.entries(n).map(([k, v]) => `${v} ${k}`).join(', ');
}
