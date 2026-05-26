/**
 * Tests for ThemeContext.
 *
 * Tests: default theme, toggle, localStorage persistence.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";

import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function TestConsumer() {
  const { mode, resolved, isLight, setMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolved}</span>
      <span data-testid="is-light">{String(isLight)}</span>
      <button
        data-testid="set-dark"
        onClick={() => setMode("dark")}
      >
        dark
      </button>
      <button
        data-testid="set-light"
        onClick={() => setMode("light")}
      >
        light
      </button>
      <button
        data-testid="set-system"
        onClick={() => setMode("system")}
      >
        system
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>,
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    vi.clearAllMocks();
  });

  it("provides 'light' as the default mode", () => {
    renderWithProvider();
    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("provides 'light' as the default resolved theme", () => {
    renderWithProvider();
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("isLight is true when resolved theme is light", () => {
    renderWithProvider();
    expect(screen.getByTestId("is-light").textContent).toBe("true");
  });

  it("switches to dark mode when setMode('dark') is called", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-dark").click();
    });

    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(screen.getByTestId("is-light").textContent).toBe("false");
  });

  it("applies 'dark' class to documentElement when dark mode is set", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-dark").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes 'dark' class when switching back to light", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-dark").click();
    });
    await act(async () => {
      screen.getByTestId("set-light").click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists theme to localStorage when changed", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-dark").click();
    });

    expect(localStorage.getItem("portify-theme")).toBe("dark");
  });

  it("loads saved theme from localStorage on mount", () => {
    localStorage.setItem("portify-theme", "dark");

    renderWithProvider();

    // After the useEffect runs on mount
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("sets data-theme attribute on documentElement", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-dark").click();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("can be set to 'system' mode", async () => {
    renderWithProvider();

    await act(async () => {
      screen.getByTestId("set-system").click();
    });

    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(localStorage.getItem("portify-theme")).toBe("system");
  });

  it("useTheme hook returns context values", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.mode).toBe("light");
    expect(result.current.resolved).toBeDefined();
    expect(typeof result.current.setMode).toBe("function");
    expect(typeof result.current.isLight).toBe("boolean");
  });
});
