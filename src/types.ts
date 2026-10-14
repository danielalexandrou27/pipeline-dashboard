// Mirrors com.hca.monitor.dashboard.DashboardModel in the engine.

export type Status =
  | 'FAILED' | 'TIMED_OUT' | 'SUSPENDED' | 'ABORTED'
  | 'LATE' | 'RUNNING' | 'PENDING_REDRIVE' | 'NOT_RUN' | 'SUCCEEDED';

export interface Incident {
  number: string;
  url: string | null;
}

export interface Job {
  type: 'STEP_FUNCTIONS' | 'INFORMATICA';
  name: string;
  folder: string | null;
  status: Status;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  error: string | null;
  failedStep: string | null;
  runCount: number;
  runId: string | null;
  consoleUrl: string | null;
  incident: Incident | null;
}

export interface Row {
  pipeline: string | null;
  upstream: Job | null;
  stepFunction: Job;
  expectedBy: string | null;
}

export interface Counts {
  total: number;
  failed: number;
  late: number;
  running: number;
  notRun: number;
  succeeded: number;
  unregistered: number;
}

export interface Dashboard {
  date: string;
  timeZone: string;
  generatedAt: string;
  counts: Counts;
  rows: Row[];
  unregistered: Row[];
}

/** The filter groups shown as summary counts. */
export type Group = 'all' | 'failed' | 'late' | 'running' | 'notRun' | 'succeeded';

export function groupOf(s: Status): Exclude<Group, 'all'> {
  switch (s) {
    case 'FAILED': case 'TIMED_OUT': case 'SUSPENDED': case 'ABORTED': return 'failed';
    case 'LATE': return 'late';
    case 'RUNNING': case 'PENDING_REDRIVE': return 'running';
    case 'NOT_RUN': return 'notRun';
    default: return 'succeeded';
  }
}
