// ─────────────────────────────────────────────────────────────────────────────
// AuthModal — Sign in / Sign up / Account panel for Supabase sync.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { ipc, IPC } from '../../lib/ipc';

type View = 'signin' | 'signup' | 'account';

export const AuthModal: React.FC = () => {
  const closeModal = useUiStore(s => s.closeModal);
  const { user, configured, setUser } = useAuthStore();
  const [view, setView] = useState<View>(user ? 'account' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition-colors';
  const btnCls = 'w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r: any = await ipc.invoke(IPC.AUTH_SIGN_IN, email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setUser({ id: r.user.id, email: r.user.email });
    setView('account');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r: any = await ipc.invoke(IPC.AUTH_SIGN_UP, email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    if (r.needsConfirmation) {
      setSuccess('Check your email to confirm your account, then sign in.');
      setView('signin');
    } else {
      setUser({ id: r.user.id, email: r.user.email });
      setView('account');
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    await ipc.invoke(IPC.AUTH_SIGN_OUT);
    setBusy(false);
    setUser(null);
    setView('signin');
    setEmail(''); setPassword('');
  };

  if (!configured) {
    return (
      <Modal open title="Sync" onClose={closeModal} width="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">Sync is not configured.</p>
          <p className="text-white/30 text-xs">Add <code className="bg-white/5 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-white/5 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your <code className="bg-white/5 px-1 rounded">.env</code> file and rebuild.</p>
        </div>
      </Modal>
    );
  }

  if (view === 'account' && user) {
    return (
      <Modal open title="Sync" onClose={closeModal} width="max-w-sm">
        <div className="flex flex-col gap-5">
          {/* Signed-in card */}
          <div className="flex items-center gap-3 bg-green-500/8 border border-green-500/20 rounded-xl p-4">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-violet-300">{user.email[0].toUpperCase()}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-green-400 font-medium">Sync active</span>
              <span className="text-sm text-white truncate">{user.email}</span>
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Syncing</p>
            {['Bookmarks', 'History', 'AI conversations', 'Settings'].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-white/60">
                <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          <button
            className={`${btnCls} bg-white/6 hover:bg-white/10 text-white/70`}
            disabled={busy}
            onClick={handleSignOut}
          >
            {busy ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title={view === 'signin' ? 'Sign in to sync' : 'Create account'} onClose={closeModal} width="max-w-sm">
      <div className="flex flex-col gap-5">
        {/* Tab toggle */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { setView('signin'); setError(null); setSuccess(null); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'signin' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >Sign In</button>
          <button
            onClick={() => { setView('signup'); setError(null); setSuccess(null); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'signup' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >Create Account</button>
        </div>

        <form onSubmit={view === 'signin' ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Email</label>
            <input
              type="email" required
              className={inputCls}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Password</label>
            <input
              type="password" required minLength={6}
              className={inputCls}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`${btnCls} bg-violet-600 hover:bg-violet-500 text-white mt-1`}
          >
            {busy ? '…' : view === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-white/25 text-center">
          Your data stays on your device. Sync is optional.
        </p>
      </div>
    </Modal>
  );
};
