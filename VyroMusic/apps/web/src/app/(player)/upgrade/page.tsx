'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Check, Loader2, Sparkles, Users, GraduationCap, Music } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  features: string[];
}

interface PlansResponse {
  plans: Plan[];
}

interface Profile {
  subscriptionTier: string;
  subscription_status?: string;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  premium: <Crown className="w-6 h-6" />,
  family: <Users className="w-6 h-6" />,
  student: <GraduationCap className="w-6 h-6" />,
  free: <Music className="w-6 h-6" />,
};

const PLAN_GRADIENT: Record<string, string> = {
  premium: 'from-vyro-500 to-cyan-500',
  family: 'from-emerald-500 to-teal-500',
  student: 'from-amber-500 to-orange-500',
  free: 'from-white/20 to-white/10',
};

export default function UpgradePage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PlansResponse>('/api/billing/plans').then(r => setPlans(r.plans)).catch(() => {});
    if (user) {
      api<Profile>('/api/me/profile').then(setProfile).catch(() => {});
    }
  }, [user]);

  const currentTier = profile?.subscriptionTier ?? user?.subscriptionTier ?? 'free';
  const hasActivePaid =
    currentTier !== 'free' && (profile?.subscription_status === 'active' || currentTier !== 'free');

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoadingPlan(planId);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/api/billing/create-checkout-session', { planId });
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError((err as Error).message || 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/api/billing/create-portal-session');
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError((err as Error).message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const paidPlans = plans.filter(p => p.id !== 'free');

  return (
    <div className="min-h-screen bg-[#080809] px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vyro-500/10 border border-vyro-500/20 text-vyro-400 text-sm font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Premium Music Experience
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-vyro-400 via-cyan-400 to-vyro-300 bg-clip-text text-transparent">
            Upgrade to Premium
          </span>
        </h1>
        <p className="text-white/50 text-lg">
          Unlimited music, no ads, HiFi audio — choose the plan that fits your life.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto mb-8 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {paidPlans.map(plan => {
          const isActive = currentTier === plan.id;
          const gradient = PLAN_GRADIENT[plan.id] ?? PLAN_GRADIENT.premium;
          const isPremium = plan.id === 'premium';

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-md transition-all duration-200 ${
                isPremium
                  ? 'border-vyro-500/40 bg-vyro-500/5 shadow-lg shadow-vyro-500/10'
                  : isActive
                  ? 'border-white/20 bg-white/[0.07]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-vyro-500 to-cyan-500 text-white text-xs font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              {isActive && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    Current plan
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                {PLAN_ICONS[plan.id]}
              </div>

              <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>

              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">
                  ${(plan.price / 100).toFixed(0)}
                </span>
                <span className="text-white/40 text-sm mb-1.5">/month</span>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={!!loadingPlan || isActive}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-white/10 text-white/40 cursor-default'
                    : isPremium
                    ? 'bg-gradient-to-r from-vyro-500 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-vyro-500/25 btn-neon'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isActive ? (
                  'Active'
                ) : (
                  `Get ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Free tier note */}
      <div className="max-w-5xl mx-auto mt-6">
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/50 shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-white/70 font-medium text-sm">Free Tier</p>
            <p className="text-white/30 text-xs mt-0.5">Ad-supported · 320kbps · Limited skips</p>
          </div>
          {currentTier === 'free' && (
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/50 text-xs font-medium">
              Current plan
            </span>
          )}
        </div>
      </div>

      {/* Manage subscription */}
      {hasActivePaid && (
        <div className="max-w-5xl mx-auto mt-8 text-center">
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/25 text-sm transition-all"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Manage Subscription
          </button>
        </div>
      )}
    </div>
  );
}
