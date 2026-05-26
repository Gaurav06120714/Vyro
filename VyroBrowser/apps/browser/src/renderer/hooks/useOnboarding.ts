// ─────────────────────────────────────────────────────────────────────────────
// useOnboarding.ts — hook that drives the multi-step onboarding wizard.
//
// Persists completion state in localStorage so the wizard only appears once.
// Exposes:
//   isComplete         — true if the user has finished onboarding
//   currentStep        — 0-based step index
//   totalSteps         — total number of steps
//   ollamaRunning      — whether Ollama is reachable
//   models             — list of installed Ollama models
//   pullStatus         — per-model pull state
//   checkOllama()      — ping Ollama and update ollamaRunning
//   pullModel(name)    — stream-pull a model, updates pullStatus
//   cancelPull(name)   — abort an in-flight pull
//   listModels()       — fetch installed models
//   next()             — advance to next step
//   back()             — go to previous step
//   complete()         — mark onboarding done and close wizard
//   skip()             — skip onboarding entirely
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { ipc, IPC } from '../lib/ipc';

const STORAGE_KEY = 'vyro:onboarding:complete';

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
}

export type PullPhase = 'idle' | 'pulling' | 'complete' | 'error';

export interface PullStatus {
  phase: PullPhase;
  percent: number;
  statusText: string;
  error?: string;
}

export interface UseOnboardingReturn {
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  ollamaRunning: boolean | null;
  ollamaUrl: string;
  models: OllamaModel[];
  pullStatus: Record<string, PullStatus>;
  checkOllama: () => Promise<void>;
  pullModel: (name: string) => Promise<void>;
  cancelPull: (name: string) => void;
  listModels: () => Promise<void>;
  next: () => void;
  back: () => void;
  complete: () => void;
  skip: () => void;
}

export const TOTAL_STEPS = 4;

export function useOnboarding(): UseOnboardingReturn {
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [pullStatus, setPullStatus] = useState<Record<string, PullStatus>>({});

  // Track cleanup functions for push-event listeners.
  const listenersRef = useRef<Array<() => void>>([]);

  // Subscribe to pull progress / complete / error push events from main.
  useEffect(() => {
    const offProgress = ipc.on(IPC.ONBOARDING_PULL_PROGRESS, (...args: unknown[]) => {
      const { model, status, percent } = args[0] as {
        model: string;
        status: string;
        percent: number;
      };
      setPullStatus(prev => ({
        ...prev,
        [model]: { phase: 'pulling', percent, statusText: status },
      }));
    });

    const offComplete = ipc.on(IPC.ONBOARDING_PULL_COMPLETE, (...args: unknown[]) => {
      const { model } = args[0] as { model: string };
      setPullStatus(prev => ({
        ...prev,
        [model]: { phase: 'complete', percent: 100, statusText: 'Downloaded' },
      }));
      // Refresh model list after pull completes.
      ipc.invoke<OllamaModel[]>(IPC.ONBOARDING_LIST_MODELS).then(list => {
        setModels(list);
      }).catch(() => undefined);
    });

    const offError = ipc.on(IPC.ONBOARDING_PULL_ERROR, (...args: unknown[]) => {
      const { model, message } = args[0] as { model: string; message: string };
      setPullStatus(prev => ({
        ...prev,
        [model]: { phase: 'error', percent: 0, statusText: 'Failed', error: message },
      }));
    });

    listenersRef.current = [offProgress, offComplete, offError];
    return () => { listenersRef.current.forEach(fn => fn()); };
  }, []);

  const checkOllama = useCallback(async () => {
    try {
      const result = await ipc.invoke<{ running: boolean; url: string }>(
        IPC.ONBOARDING_CHECK_OLLAMA,
      );
      setOllamaRunning(result.running);
      setOllamaUrl(result.url);
    } catch {
      setOllamaRunning(false);
    }
  }, []);

  const listModels = useCallback(async () => {
    try {
      const list = await ipc.invoke<OllamaModel[]>(IPC.ONBOARDING_LIST_MODELS);
      setModels(list);
    } catch {
      setModels([]);
    }
  }, []);

  const pullModel = useCallback(async (name: string) => {
    setPullStatus(prev => ({
      ...prev,
      [name]: { phase: 'pulling', percent: 0, statusText: 'Starting…' },
    }));
    try {
      await ipc.invoke(IPC.ONBOARDING_PULL_MODEL, { model: name });
    } catch (err) {
      setPullStatus(prev => ({
        ...prev,
        [name]: { phase: 'error', percent: 0, statusText: 'Error', error: (err as Error).message },
      }));
    }
  }, []);

  const cancelPull = useCallback((name: string) => {
    ipc.invoke(IPC.ONBOARDING_CANCEL_PULL, { model: name }).catch(() => undefined);
    setPullStatus(prev => ({
      ...prev,
      [name]: { phase: 'idle', percent: 0, statusText: '' },
    }));
  }, []);

  const next = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const back = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0));
  }, []);

  const complete = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* ignore */ }
    setIsComplete(true);
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  return {
    isComplete,
    currentStep,
    totalSteps: TOTAL_STEPS,
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
  };
}
