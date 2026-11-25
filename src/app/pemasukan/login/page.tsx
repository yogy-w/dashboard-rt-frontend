"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PemasukanLoginPage() {
  const router = useRouter();
  // const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/pemasukan-auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Login gagal.');
      // const next = searchParams.get('next');
      // router.replace(next === '/pemasukan' ? next : '/pemasukan');
      // router.refresh();
      router.replace('/pemasukan');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Login gagal.'); }
    finally { setLoading(false); }
  }

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#f6f8fc', fontFamily: 'Arial, sans-serif' }}>
    <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, padding: 28, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 8px 28px rgba(15,23,42,.06)' }}>
      <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700, marginBottom: 10 }}>DIGITAL RT</div>
      <h1 style={{ margin: '0 0 8px', fontSize: 25, color: '#0f172a' }}>Login Pengurus</h1>
      <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: 1.5 }}>Masuk menggunakan akun Ketua RT, Bendahara, atau Sekretaris.</p>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Username</label>
      <input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 16 }} />
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
      <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 16 }} />
      {error && <div role="alert" style={{ marginBottom: 14, color: '#b91c1c', background: '#fef2f2', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <button disabled={loading} type="submit" style={{ width: '100%', height: 45, border: 0, borderRadius: 8, background: loading ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Memeriksa...' : 'Login'}</button>
      <p style={{ fontSize: 12, color: '#64748b', margin: '16px 0 0' }}>Sesi login berlaku selama 8 jam di perangkat ini.</p>
    </form>
  </main>;
}
