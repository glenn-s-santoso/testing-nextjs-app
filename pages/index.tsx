import { useState } from 'react';

interface WalletSummary {
  subscription: number;
  topup: number;
  total: number;
}

interface LaunchResult {
  launch_url: string;
  launch_token: string;
  expires_at: string;
}

interface LaunchHistoryItem {
  listing_id: string;
  title: string;
  launch_count: number;
  last_launched_at: string;
  total_metered_credits_charged: number;
}

export default function Harness() {
  const [email, setEmail] = useState('carol@example.com');
  const [password, setPassword] = useState('Test@1234');
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [history, setHistory] = useState<LaunchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refreshWallet(bearerToken: string) {
    const res = await fetch('/api/harness/wallet', {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const body = await res.json();
    if (body.success) setWallet(body.data);
  }

  async function refreshHistory(bearerToken: string) {
    const res = await fetch('/api/harness/launch-history', {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const body = await res.json();
    if (body.success) setHistory(body.data.data);
  }

  async function handleLogin() {
    setError(null);
    const res = await fetch('/api/harness/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!body.success) {
      setError(body.error);
      return;
    }
    setToken(body.data.token);
    await refreshWallet(body.data.token);
    await refreshHistory(body.data.token);
  }

  async function handleLaunch() {
    if (!token) return;
    setError(null);
    const res = await fetch('/api/harness/launch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!body.success) {
      setError(body.error);
      return;
    }
    setLaunchResult(body.data);
    await refreshWallet(token);
    await refreshHistory(token);
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Mythos Harness</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section style={{ marginBottom: '2rem' }}>
        <h2>1. Login</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button onClick={handleLogin}>Login</button>
        {token && <p>Logged in.</p>}
      </section>

      {wallet && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Wallet</h2>
          <p>Subscription: {wallet.subscription} | Topup: {wallet.topup} | Total: {wallet.total}</p>
        </section>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. Launch</h2>
        <button onClick={handleLaunch} disabled={!token}>
          Launch Calculator
        </button>
        {launchResult && (
          <p>
            <a href={`/calculator?lt=${encodeURIComponent(launchResult.launch_token)}`} target="_blank" rel="noreferrer">
              Open Calculator
            </a>{' '}
            (expires {launchResult.expires_at})
          </p>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2>Launch History</h2>
          <ul>
            {history.map((item) => (
              <li key={item.listing_id}>
                {item.title}: {item.launch_count} launches, {item.total_metered_credits_charged} credits charged
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
