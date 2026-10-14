import type { Status } from './types';

export const STATUS_LABEL: Record<Status, string> = {
  FAILED: 'Failed',
  TIMED_OUT: 'Timed out',
  SUSPENDED: 'Suspended',
  ABORTED: 'Aborted',
  LATE: 'Late',
  RUNNING: 'Running',
  PENDING_REDRIVE: 'Redriving',
  NOT_RUN: 'Not run yet',
  SUCCEEDED: 'Succeeded',
};

/** "1h 04m", "7m 12s", "42s" */
export function duration(seconds: number | null): string {
  if (seconds == null) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m >= 10) return `${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function clock(iso: string | null, timeZone: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
}

/** "Oct 14" style day, so a run that started yesterday evening is obvious. */
export function day(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

/** "4:30 AM" from the registry's "04:30". */
export function expected(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function longDate(isoDate: string): string {
  const [y, mo, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export function zoneShort(timeZone: string, at: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date(at)).find((p) => p.type === 'timeZoneName');
  return part?.value ?? timeZone;
}
