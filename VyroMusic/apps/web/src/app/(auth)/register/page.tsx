'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Music } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const register = useAuthStore(s => s.register);
  const isLoading = useAuthStore(s => s.isLoading);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, username, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#050508' }}>
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl animate-pulse-slow" style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', animationDelay: '1.2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scaleIn">
        <div className="glass-strong rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vyro-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-vyro-500/30 animate-pulse-glow">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl gradient-text tracking-tight">vyro</span>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-1.5">Create your account</h1>
          <p className="text-white/40 text-center text-sm mb-7">Free forever. No credit card required.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-5 animate-slideUp">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-vyro-500/60 focus:bg-white/[0.08] transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-vyro-500/60 focus:bg-white/[0.08] transition-all text-sm"
                placeholder="your_username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full px-4 py-3.5 pr-12 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-vyro-500/60 focus:bg-white/[0.08] transition-all text-sm"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-neon w-full text-white py-3.5 mt-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-vyro-400 hover:text-vyro-300 transition-colors font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
