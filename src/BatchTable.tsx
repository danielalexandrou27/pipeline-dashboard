import { useState } from 'react';
import { api } from './api';
import { STATUS_LABEL, clock, day, duration, expected } from './format';
import { groupOf, type Dashboard, type Job, type Row } from './types';

/** One step function and the rows linking it to each upstream workflow. */
export interface SfGroup {
  key: string;
  rows: Row[];
}

interface Props {
  groups: SfGroup[];
  data: Dashboard;
  withWorkflow: boolean;
}

export function BatchTable({ groups, data, withWorkflow }: Props) {
  return (
    <table className={`batch${withWorkflow ? '' : ' no-wf'}`}>
      <thead>
        <tr>
          {withWorkflow && <th scope="col" className="col-pipeline">Pipeline</th>}
          {withWorkflow && <th scope="col" className="col-job">Informatica workflow</th>}
          {withWorkflow && <th scope="col" className="col-status">Workflow status</th>}
          <th scope="col" className="col-job">Step function</th>
          <th scope="col" className="col-status">Step function status</th>
          <th scope="col" className="col-incident">Incident</th>
        </tr>
      </thead>
      {groups.map((g) => <Group key={g.key} group={g} data={data} withWorkflow={withWorkflow} />)}
    </table>
  );
}

function Group({ group, data, withWorkflow }: { group: SfGroup; data: Dashboard; withWorkflow: boolean }) {
  const [attempts, setAttempts] = useState<Job[] | 'loading' | string | null>(null);
  const first = group.rows[0];
  const sf = first.stepFunction;
  const span = group.rows.length;
  const tz = data.timeZone;
  const columns = withWorkflow ? 6 : 3;

  async function toggleAttempts() {
    if (attempts) { setAttempts(null); return; }
    setAttempts('loading');
    try {
      setAttempts(await api.attempts(sf, data.date));
    } catch (e) {
      setAttempts(e instanceof Error ? e.message : 'Could not load the runs.');
    }
  }

  return (
    <tbody className={`sf-group g-${groupOf(sf.status)}`}>
      {group.rows.map((r, i) => (
        <tr key={r.upstream ? `${r.upstream.folder}/${r.upstream.name}` : i} className={i === 0 ? 'first' : 'more'}>
          {withWorkflow && i === 0 && (
            <td rowSpan={span} className="pipeline" data-label="Pipeline">{r.pipeline}</td>
          )}
          {withWorkflow && (
            r.upstream ? (
              <>
                <td className="job wf" data-label="Informatica workflow"><JobCell job={r.upstream} tz={tz} /></td>
                <td className="status" data-label="Workflow status"><StatusCell job={r.upstream} /></td>
              </>
            ) : (
              <td colSpan={2} className="job wf none" data-label="Informatica workflow">
                <span className="muted">No upstream workflow</span>
              </td>
            )
          )}
          {i === 0 && (
            <>
              <td rowSpan={span} className="job sf" data-label="Step function">
                <JobCell job={sf} tz={tz} />
                {sf.consoleUrl && (
                  <a className="console" href={sf.consoleUrl} target="_blank" rel="noreferrer">Open in AWS console</a>
                )}
              </td>
              <td rowSpan={span} className="status" data-label="Step function status">
                <StatusCell job={sf} expectedBy={first.expectedBy} />
                {sf.runCount > 1 && (
                  <button type="button" className="runs" aria-expanded={attempts != null} onClick={toggleAttempts}>
                    {sf.runCount} runs today
                  </button>
                )}
              </td>
              <td rowSpan={span} className="incident" data-label="Incident">
                <IncidentCell job={sf} />
              </td>
            </>
          )}
        </tr>
      ))}
      {attempts != null && (
        <tr className="attempts-row">
          <td colSpan={columns}>
            {attempts === 'loading' ? <p className="muted">Loading runs…</p>
              : typeof attempts === 'string' ? <p className="error-text">{attempts}</p>
              : <Attempts runs={attempts} tz={tz} />}
          </td>
        </tr>
      )}
    </tbody>
  );
}

function JobCell({ job, tz }: { job: Job; tz: string }) {
  return (
    <div className="job-cell">
      <p className="job-name">{job.name}</p>
      {(job.folder || job.startedAt) && (
        <p className="job-meta">
          {job.folder && <span>Folder {job.folder}</span>}
          {job.startedAt && <span>{times(job, tz)}</span>}
        </p>
      )}
      {job.error && (
        <p className="error-text">
          {job.failedStep && <span className="failed-step">At step {job.failedStep}: </span>}
          {job.error}
        </p>
      )}
    </div>
  );
}

function times(job: Job, tz: string): string {
  const start = clock(job.startedAt, tz);
  const startDay = job.startedAt ? day(job.startedAt, tz) : '';
  const endDay = job.endedAt ? day(job.endedAt, tz) : '';
  const end = job.endedAt ? clock(job.endedAt, tz) + (endDay !== startDay ? ` ${endDay}` : '') : null;
  const d = duration(job.durationSeconds);
  if (end) return `${start} to ${end}, ${d}`;
  if (job.status === 'RUNNING' || job.status === 'PENDING_REDRIVE') return `Started ${start}, ${d} so far`;
  return `Started ${start}`;
}

function StatusCell({ job, expectedBy }: { job: Job; expectedBy?: string | null }) {
  const due = expectedBy && (job.status === 'NOT_RUN' || job.status === 'LATE');
  return (
    <div className={`status-cell s-${groupOf(job.status)}`}>
      <span className="status-label">{STATUS_LABEL[job.status]}</span>
      {due && <span className="due">Due by {expected(expectedBy!)}</span>}
    </div>
  );
}

function IncidentCell({ job }: { job: Job }) {
  if (!job.incident) return <span className="muted">{groupOf(job.status) === 'failed' ? 'Not raised yet' : ''}</span>;
  return job.incident.url
    ? <a href={job.incident.url} target="_blank" rel="noreferrer">{job.incident.number}</a>
    : <span>{job.incident.number}</span>;
}

function Attempts({ runs, tz }: { runs: Job[]; tz: string }) {
  return (
    <ol className="attempts" aria-label="Runs today, newest first">
      {runs.map((r) => (
        <li key={r.runId ?? r.startedAt} className={`s-${groupOf(r.status)}`}>
          <span className="status-label">{STATUS_LABEL[r.status]}</span>
          <span className="attempt-time">{times(r, tz)}</span>
          {r.error && <span className="error-text">{r.failedStep ? `At step ${r.failedStep}: ` : ''}{r.error}</span>}
          <span className="attempt-links">
            {r.incident && (r.incident.url
              ? <a href={r.incident.url} target="_blank" rel="noreferrer">{r.incident.number}</a>
              : r.incident.number)}
            {r.consoleUrl && <a href={r.consoleUrl} target="_blank" rel="noreferrer">AWS console</a>}
          </span>
        </li>
      ))}
    </ol>
  );
}
