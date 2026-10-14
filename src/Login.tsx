import { useState, type FormEvent } from 'react';
import { api } from './api';

export function Login({ onSignedIn }: { onSignedIn: (user: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api.login(username, password);
      onSignedIn(me.user);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Wrong username or password.');
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-form" onSubmit={submit}>
        <h1>Nightly batch</h1>
        <p className="login-lede">Sign in with the team's dashboard account.</p>
        <label>
          Username
          <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password}
                 onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
