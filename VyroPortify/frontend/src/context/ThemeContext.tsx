"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  resolved: "light",
  setMode: () => {},
  isLight: true,
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem("portify-theme") as ThemeMode | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setModeState(saved);
    }
  }, []);

  // Resolve theme and listen for system changes
  useEffect(() => {
    const r = mode === "system" ? getSystemTheme() : mode;
    setResolved(r);

    // Apply to <html> for global CSS access
    document.documentElement.setAttribute("data-theme", r);
    document.documentElement.classList.toggle("dark", r === "dark");

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light";
        setResolved(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("portify-theme", m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, isLight: resolved === "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
