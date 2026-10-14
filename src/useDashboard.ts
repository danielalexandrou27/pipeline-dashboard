import { useCallback, useEffect, useRef, useState } from 'react';
import { api, SignedOut } from './api';
import type { Dashboard } from './types';

export type Connection = 'connecting' | 'live' | 'reconnecting';

/**
 * Loads the dashboard and keeps it current: the engine pushes a "changed" event over
 * server-sent events whenever a run or incident changes, and the page reloads its data.
 * A slow timer also reloads every minute so running durations and late flags tick over.
 */
export function useDashboard(onSignedOut: () => void) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const inFlight = useRef(false);
  const again = useRef(false);
  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;

  const load = useCallback(async () => {
    if (inFlight.current) { again.current = true; return; }
    inFlight.current = true;
    try {
      setData(await api.dashboard());
      setError(null);
    } catch (e) {
      if (e instanceof SignedOut) { signedOut.current(); return; }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      if (again.current) { again.current = false; void load(); }
    }
  }, []);

  useEffect(() => {
    void load();
    const es = new EventSource('/api/stream');
    es.addEventListener('open', () => { setConnection('live'); void load(); });
    es.addEventListener('changed', () => void load());
    es.addEventListener('error', () => setConnection('reconnecting'));
    const tick = window.setInterval(() => void load(), 60_000);
    return () => { es.close(); window.clearInterval(tick); };
  }, [load]);

  return { data, error, connection, reload: load };
}
