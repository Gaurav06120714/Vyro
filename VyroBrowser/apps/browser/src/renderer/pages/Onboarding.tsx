// ─────────────────────────────────────────────────────────────────────────────
// Onboarding.tsx — First-launch wizard shown before the main browser UI.
//
// Steps:
//   0 — Welcome            Intro to Vyro, platform awareness
//   1 — Ollama check       Detect if Ollama is running, show install guide
//   2 — Model selection    Pull recommended models or confirm existing ones
//   3 — Ready              All set, launch button
//
// All steps are self-contained sections of this file for clarity.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import {
  useOnboarding,
  TOTAL_STEPS,
  OllamaModel,
  PullStatus,
} from '../hooks/useOnboarding';

// ── Vyro Logo component ──────────────────────────────────────────────────────

const VyroLogo: React.FC<{ size?: number; animated?: boolean }> = ({
  size = 80,
  animated = false,
}) => {
  const platform = typeof window !== 'undefined' && window.vyro ? window.vyro.platform : 'darwin';
  const isMac = platform === 'darwin';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow rings */}
      {animated && (
        <>
          <span
            className="absolute rounded-full border border-violet-500/20"
            style={{
              width: size * 1.6,
              height: size * 1.6,
              animation: 'vyro-ping 2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          <span
            className="absolute rounded-full border border-cyan-400/15"
            style={{
              width: size * 1.35,
              height: size * 1.35,
              animation: 'vyro-ping 2s cubic-bezier(0,0,0.2,1) infinite 0.4s',
            }}
          />
        </>
      )}
      {/* Glow backdrop */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(6,182,212,0.15) 60%, transparent 80%)',
          filter: 'blur(12px)',
        }}
      />
      {/* Icon container — circular on macOS, rounded-square on Windows/Linux */}
      <div
        className="relative flex items-center justify-center overflow-hidden shadow-2xl"
        style={{
          width: size,
          height: size,
          borderRadius: isMac ? '50%' : `${size * 0.215}px`,
          background: isMac
            ? 'radial-gradient(circle at 40% 35%, #1a1a2e, #0a0a14)'
            : 'radial-gradient(circle at 40% 35%, #1e2a5e, #080d1f)',
          border: isMac
            ? '2px solid rgba(209,213,219,0.25)'
            : '1.5px solid rgba(59,130,246,0.35)',
          boxShadow: isMac
            ? '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 0 20px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: size * 0.72, height: size * 0.72 }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lg-v" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="lg-w1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="lg-w2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          {/* V left stroke */}
          <polygon points="15,18 28,18 50,62 37,62" fill="url(#lg-v)" opacity="0.95" />
          {/* V right stroke */}
          <polygon points="72,18 85,18 63,62 50,62" fill="url(#lg-v)" opacity="0.85" />
          {/* Wave ribbons */}
          <path d="M8 50 Q25 42 40 52 Q58 64 75 50 Q84 43 92 47"
            stroke="url(#lg-w1)" strokeWidth="5.5" strokeLinecap="round" opacity="0.9" />
          <path d="M8 58 Q25 50 40 60 Q58 72 75 58 Q84 51 92 55"
            stroke="url(#lg-w2)" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <path d="M8 66 Q25 58 40 68 Q58 80 75 66 Q84 59 92 63"
            stroke="url(#lg-w1)" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
        </svg>
      </div>
      <style>{`
        @keyframes vyro-ping {
          0%   { transform: scale(0.85); opacity: 0.8; }
          70%  { transform: scale(1);    opacity: 0; }
          100% { transform: scale(1);    opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ── Small shared primitives ──────────────────────────────────────────────────

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={[
          'w-2 h-2 rounded-full transition-all duration-300',
          i === current
            ? 'bg-violet-500 w-4'
            : i < current
            ? 'bg-violet-400/50'
            : 'bg-white/20',
        ].join(' ')}
      />
    ))}
  </div>
);

const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    {...props}
    className={[
      'px-6 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500',
      'text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
      'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-transparent',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    {...props}
    className={[
      'px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80',
      'transition-colors duration-200 focus:outline-none',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

// ── Step 0: Welcome ──────────────────────────────────────────────────────────

const StepWelcome: React.FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  const platform = typeof window !== 'undefined' && window.vyro ? window.vyro.platform : 'darwin';
  const platformLabel =
    platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';

  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-md">
      {/* Logo with animated glow */}
      <VyroLogo size={96} animated />

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Vyro</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          An AI-powered browser running entirely on your {platformLabel} machine.
          No cloud, no subscriptions — your data stays yours.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { icon: '🧠', label: 'Local AI', desc: 'Ollama runs on device' },
          { icon: '🚫', label: 'Ad-free', desc: 'Network-level blocking' },
          { icon: '⌨️', label: 'Keyboard-first', desc: 'Cmd+K for everything' },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold text-white">{label}</span>
            <span className="text-[11px] text-white/40 text-center leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <PrimaryButton onClick={onNext} className="w-full">
          Get started →
        </PrimaryButton>
        <GhostButton onClick={onSkip}>
          Skip setup — take me to the browser
        </GhostButton>
      </div>
    </div>
  );
};

// ── Step 1: Ollama check ──────────────────────────────────────────────────────

const StepOllama: React.FC<{
  ollamaRunning: boolean | null;
  ollamaUrl: string;
  onCheck: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
}> = ({ ollamaRunning, ollamaUrl, onCheck, onNext, onBack }) => {
  const [checking, setChecking] = React.useState(false);
  const platform = typeof window !== 'undefined' && window.vyro ? window.vyro.platform : 'darwin';

  const installCmd =
    platform === 'darwin'
      ? 'brew install ollama && brew services start ollama'
      : platform === 'win32'
      ? 'winget install Ollama.Ollama'
      : 'curl -fsSL https://ollama.com/install.sh | sh';

  const downloadUrl =
    platform === 'darwin'
      ? 'https://ollama.com/download/mac'
      : platform === 'win32'
      ? 'https://ollama.com/download/windows'
      : 'https://ollama.com/download/linux';

  const openDownload = () => {
    window.vyro?.invoke('shell:open-external' as never, { url: downloadUrl });
  };

  const handleCheck = async () => {
    setChecking(true);
    await onCheck();
    setChecking(false);
  };

  return (
    <div className="flex flex-col gap-5 max-w-md w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">AI Engine Setup</h2>
        <p className="text-white/50 text-sm">
          Vyro uses{' '}
          <a
            className="text-violet-400 hover:text-violet-300"
            onClick={() => window.vyro?.invoke('nav:load-url' as never, { url: 'https://ollama.com', tabId: 'new' })}
          >
            Ollama
          </a>{' '}
          to run large language models locally.
        </p>
      </div>

      {/* Status card */}
      <div
        className={[
          'flex items-center gap-3 p-4 rounded-xl border',
          ollamaRunning === true
            ? 'bg-green-900/30 border-green-500/40 text-green-300'
            : ollamaRunning === false
            ? 'bg-red-900/20 border-red-500/30 text-red-300'
            : 'bg-white/5 border-white/10 text-white/50',
        ].join(' ')}
      >
        <span className="text-2xl">
          {ollamaRunning === true ? '✅' : ollamaRunning === false ? '❌' : '🔍'}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {ollamaRunning === true
              ? 'Ollama is running'
              : ollamaRunning === false
              ? 'Ollama not detected'
              : 'Checking for Ollama…'}
          </span>
          <span className="text-xs opacity-70">{ollamaUrl}</span>
        </div>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors disabled:opacity-40"
        >
          {checking ? 'Checking…' : 'Re-check'}
        </button>
      </div>

      {ollamaRunning === false && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/60">Install Ollama then click Re-check:</p>
          <div className="relative group">
            <pre className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {installCmd}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(installCmd).catch(() => undefined)}
              className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              copy
            </button>
          </div>
          <button
            onClick={openDownload}
            className="flex items-center gap-2 w-full p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 transition-colors text-left"
          >
            <span className="text-lg">⬇️</span>
            <div>
              <p className="text-sm font-semibold text-violet-300">Download Ollama</p>
              <p className="text-xs text-white/40">Opens ollama.com — free desktop installer</p>
            </div>
            <span className="ml-auto text-white/30 text-xs">↗</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onNext} disabled={ollamaRunning !== true} className="flex-1">
          {ollamaRunning === true ? 'Continue →' : 'Skip AI setup'}
        </PrimaryButton>
        {ollamaRunning !== true && (
          <GhostButton onClick={onNext}>Skip →</GhostButton>
        )}
      </div>
    </div>
  );
};

// ── Step 2: Model selection / pull ────────────────────────────────────────────

interface RecommendedModel {
  name: string;
  label: string;
  description: string;
  sizeLabel: string;
  vram: string;
}

const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    name: 'llama3.2',
    label: 'Llama 3.2 3B',
    description: 'Fast, lightweight — great for quick answers',
    sizeLabel: '~2 GB',
    vram: '4 GB RAM',
  },
  {
    name: 'llama3.1:8b',
    label: 'Llama 3.1 8B',
    description: 'Balanced — best quality/speed trade-off',
    sizeLabel: '~5 GB',
    vram: '8 GB RAM',
  },
  {
    name: 'qwen2.5-coder:7b',
    label: 'Qwen 2.5 Coder 7B',
    description: 'Coding specialist — excellent for dev workflows',
    sizeLabel: '~4.7 GB',
    vram: '8 GB RAM',
  },
];

const ModelRow: React.FC<{
  model: RecommendedModel;
  installed: boolean;
  status?: PullStatus;
  onPull: () => void;
  onCancel: () => void;
}> = ({ model, installed, status, onPull, onCancel }) => {
  const phase = status?.phase ?? 'idle';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{model.label}</span>
          {installed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium shrink-0">
              Installed
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 truncate">{model.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-white/30">{model.sizeLabel}</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/30">{model.vram}</span>
        </div>
        {phase === 'pulling' && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-white/40 mb-1">
              <span>{status?.statusText}</span>
              <span>{status?.percent}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${status?.percent ?? 0}%` }}
              />
            </div>
          </div>
        )}
        {phase === 'error' && (
          <p className="text-[11px] text-red-400 mt-1">{status?.error}</p>
        )}
      </div>

      <div className="shrink-0">
        {installed || phase === 'complete' ? (
          <span className="text-green-400 text-lg">✓</span>
        ) : phase === 'pulling' ? (
          <button
            onClick={onCancel}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={onPull}
            className="text-xs px-2.5 py-1 rounded-lg bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 transition-colors"
          >
            Pull
          </button>
        )}
      </div>
    </div>
  );
};

const StepModels: React.FC<{
  models: OllamaModel[];
  pullStatus: Record<string, PullStatus>;
  ollamaRunning: boolean | null;
  onPull: (name: string) => Promise<void>;
  onCancel: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ models, pullStatus, ollamaRunning, onPull, onCancel, onNext, onBack }) => {
  const installedNames = new Set(models.map(m => m.name));
  const hasAny =
    installedNames.size > 0 ||
    Object.values(pullStatus).some(s => s.phase === 'complete');

  return (
    <div className="flex flex-col gap-4 max-w-md w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">Choose a Model</h2>
        <p className="text-white/50 text-sm">
          Pull at least one model to use the AI assistant. You can add more later.
        </p>
      </div>

      {!ollamaRunning && (
        <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-300 text-xs">
          Ollama isn't running — model pulls will fail. Go back to set it up.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {RECOMMENDED_MODELS.map(m => (
          <ModelRow
            key={m.name}
            model={m}
            installed={installedNames.has(m.name)}
            status={pullStatus[m.name]}
            onPull={() => onPull(m.name)}
            onCancel={() => onCancel(m.name)}
          />
        ))}
      </div>

      {models.length > 0 && (
        <p className="text-xs text-white/30 text-center">
          {models.length} model{models.length !== 1 ? 's' : ''} already installed
        </p>
      )}

      <div className="flex items-center gap-3 mt-1">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onNext} className="flex-1">
          {hasAny ? 'Continue →' : 'Skip for now →'}
        </PrimaryButton>
      </div>
    </div>
  );
};

// ── Step 3: Ready ─────────────────────────────────────────────────────────────

const StepReady: React.FC<{
  models: OllamaModel[];
  ollamaRunning: boolean | null;
  onComplete: () => void;
  onBack: () => void;
}> = ({ models, ollamaRunning, onComplete, onBack }) => {
  const [countdown, setCountdown] = React.useState(3);
  const platform = typeof window !== 'undefined' && window.vyro ? window.vyro.platform : 'darwin';
  const mod = platform === 'darwin' ? 'Cmd' : 'Ctrl';

  // Auto-launch countdown when Ollama + model are ready
  React.useEffect(() => {
    if (!(ollamaRunning && models.length > 0)) return;
    if (countdown <= 0) { onComplete(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, ollamaRunning, models.length, onComplete]);

  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-md">
      {/* Success icon with animated ring */}
      <div className="relative">
        {ollamaRunning && models.length > 0 && (
          <span className="absolute inset-0 rounded-full border-2 border-green-400/40"
            style={{ animation: 'vyro-ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
        )}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-900/50">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          {ollamaRunning && models.length > 0
            ? `Ollama is running with ${models.length} model${models.length !== 1 ? 's' : ''}. Launching browser in ${countdown}…`
            : ollamaRunning
            ? "Ollama is running. Pull a model from the AI sidebar when ready."
            : 'You can set up AI anytime from the sidebar or Settings → AI.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full text-left">
        {[
          { shortcut: `${mod}+K`, desc: 'Command palette' },
          { shortcut: `${mod}+T`, desc: 'New tab' },
          { shortcut: `${mod}+L`, desc: 'Focus address bar' },
          { shortcut: `${mod}+F`, desc: 'Find in page' },
        ].map(({ shortcut, desc }) => (
          <div key={shortcut} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5">
            <kbd className="text-[10px] font-mono bg-white/10 text-white/70 px-1.5 py-0.5 rounded shrink-0">
              {shortcut}
            </kbd>
            <span className="text-xs text-white/50">{desc}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 w-full">
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onComplete} className="flex-1">
          {ollamaRunning && models.length > 0 ? `Launch Vyro (${countdown})` : 'Launch Vyro →'}
        </PrimaryButton>
      </div>
    </div>
  );
};

// ── Root Onboarding component ─────────────────────────────────────────────────

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const {
    currentStep,
    ollamaRunning,
    ollamaUrl,
    models,
    pullStatus,
    checkOllama,
    pullModel,
    cancelPull,
    listModels,
    next,
    back,
    complete,
    skip,
  } = useOnboarding();

  // Check Ollama and list models whenever we arrive on those steps.
  useEffect(() => {
    if (currentStep === 1) {
      checkOllama();
    }
    if (currentStep === 2) {
      listModels();
    }
  }, [currentStep, checkOllama, listModels]);

  const handleComplete = () => {
    complete();
    onComplete();
  };

  const handleSkip = () => {
    skip();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-base)]">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-900/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-xl">
        {/* Step dots */}
        <StepDots current={currentStep} total={TOTAL_STEPS} />

        {/* Step content */}
        <div className="w-full flex justify-center" key={currentStep} style={{ animation: 'stepIn 300ms cubic-bezier(0.34,1.56,0.64,1)' }}>
          {currentStep === 0 && (
            <StepWelcome onNext={next} onSkip={handleSkip} />
          )}
          {currentStep === 1 && (
            <StepOllama
              ollamaRunning={ollamaRunning}
              ollamaUrl={ollamaUrl}
              onCheck={checkOllama}
              onNext={next}
              onBack={back}
            />
          )}
          {currentStep === 2 && (
            <StepModels
              models={models}
              pullStatus={pullStatus}
              ollamaRunning={ollamaRunning}
              onPull={pullModel}
              onCancel={cancelPull}
              onNext={next}
              onBack={back}
            />
          )}
          {currentStep === 3 && (
            <StepReady
              models={models}
              ollamaRunning={ollamaRunning}
              onComplete={handleComplete}
              onBack={back}
            />
          )}
        </div>
        <style>{`
          @keyframes stepIn {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Onboarding;
