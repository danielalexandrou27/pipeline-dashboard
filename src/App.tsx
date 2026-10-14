import { useEffect, useState } from 'react';
import { api, SignedOut } from './api';
import { Login } from './Login';
import { DashboardPage } from './DashboardPage';

type Session = { state: 'checking' } | { state: 'signedOut' } | { state: 'signedIn'; user: string };

export function App() {
  const [session, setSession] = useState<Session>({ state: 'checking' });

  useEffect(() => {
    api.me()
      .then((me) => setSession({ state: 'signedIn', user: me.user }))
      .catch(() => setSession({ state: 'signedOut' }));
  }, []);

  if (session.state === 'checking') return null;
  if (session.state === 'signedOut') {
    return <Login onSignedIn={(user) => setSession({ state: 'signedIn', user })} />;
  }
  return (
    <DashboardPage
      onSignedOut={() => setSession({ state: 'signedOut' })}
      onSignOut={async () => {
        await api.logout().catch((e) => { if (!(e instanceof SignedOut)) throw e; });
        setSession({ state: 'signedOut' });
      }}
    />
  );
}
