'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen bg-neutral-900 items-center justify-center">
      <div className="w-full max-w-sm px-8 py-10 bg-neutral-950 border border-white/10 rounded-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-wide text-white">Marshall Motion Studio</h1>
          <p className="text-sm text-white/40">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          {error && (
            <p className="text-xs text-red-400">Incorrect password</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-marshall-gold text-black font-semibold rounded-lg hover:bg-marshall-gold/90 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}
