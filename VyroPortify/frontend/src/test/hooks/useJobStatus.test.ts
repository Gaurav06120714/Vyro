/**
 * Tests for the useJobStatus hook.
 *
 * Tests: initial state, poll calls API, cleanup on unmount, error handling.
 * Note: the hook uses setTimeout for polling. Tests use real timers with
 * sufficient timeout, or verify structural behavior without waiting for timers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock Clerk before the hook is imported
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    getToken: vi.fn().mockResolvedValue("mock-token"),
  }),
}));

// Mock the API module
const mockGetPortfolioStatus = vi.fn();

vi.mock("@/lib/api", () => ({
  getPortfolioStatus: (...args: unknown[]) => mockGetPortfolioStatus(...args),
}));

import { useJobStatus } from "@/hooks/useJobStatus";

const JOB_ID = "portfolio-job-123";

describe("useJobStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with 'parsing' phase and null error", () => {
    // Don't let the async poll settle — just check initial sync state
    mockGetPortfolioStatus.mockReturnValue(new Promise(() => {})); // never resolves

    const { result, unmount } = renderHook(() => useJobStatus(JOB_ID));

    expect(result.current.phase).toBe("parsing");
    expect(result.current.error).toBeNull();
    expect(result.current.portfolioStatus).toBeNull();

    unmount();
  });

  it("calls getPortfolioStatus with the correct jobId and token", async () => {
    mockGetPortfolioStatus.mockResolvedValue({
      id: JOB_ID,
      status: "queued",
      html_url: null,
      slug: "test-slug",
      ai_fallback: false,
    });

    const { unmount } = renderHook(() => useJobStatus(JOB_ID));

    await act(async () => {
      // Flush promises to let the first poll complete
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGetPortfolioStatus).toHaveBeenCalledWith(JOB_ID, "mock-token");

    unmount();
  });

  it("sets portfolioStatus after a successful poll", async () => {
    mockGetPortfolioStatus.mockResolvedValue({
      id: JOB_ID,
      status: "queued",
      html_url: null,
      slug: "test-slug",
      ai_fallback: false,
    });

    const { result, unmount } = renderHook(() => useJobStatus(JOB_ID));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.portfolioStatus).not.toBeNull();
    expect(result.current.portfolioStatus?.status).toBe("queued");

    unmount();
  });

  it("sets phase=done when status is 'published'", async () => {
    mockGetPortfolioStatus.mockResolvedValue({
      id: JOB_ID,
      status: "published",
      html_url: "https://portify.ai/p/test-slug",
      slug: "test-slug",
      ai_fallback: false,
    });

    const { result, unmount } = renderHook(() => useJobStatus(JOB_ID));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.phase).toBe("done");

    unmount();
  });

  it("sets phase=failed and error message when status is 'failed'", async () => {
    mockGetPortfolioStatus.mockResolvedValue({
      id: JOB_ID,
      status: "failed",
      html_url: null,
      slug: "test-slug",
      ai_fallback: false,
    });

    const { result, unmount } = renderHook(() => useJobStatus(JOB_ID));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.phase).toBe("failed");
    expect(result.current.error).not.toBeNull();

    unmount();
  });

  it("handles fetch error gracefully without crashing", async () => {
    mockGetPortfolioStatus.mockRejectedValue(new Error("Network error"));

    const { result, unmount } = renderHook(() => useJobStatus(JOB_ID));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Phase stays in initial "parsing" state — transient errors don't crash the hook
    expect(result.current.phase).toBe("parsing");
    // error is only set on explicit "failed" backend status, not network errors
    expect(result.current.error).toBeNull();

    unmount();
  });

  it("stops making API calls after unmount", async () => {
    mockGetPortfolioStatus.mockResolvedValue({
      id: JOB_ID,
      status: "queued",
      html_url: null,
      slug: "test-slug",
      ai_fallback: false,
    });

    const { unmount } = renderHook(() => useJobStatus(JOB_ID));

    // Let first poll settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const countBeforeUnmount = mockGetPortfolioStatus.mock.calls.length;

    unmount();

    // Wait past one poll interval — no new calls should be made
    await new Promise((r) => setTimeout(r, 200));

    // Unmounted component should not trigger more polls
    // (stopped.current = true prevents re-scheduling)
    expect(mockGetPortfolioStatus.mock.calls.length).toBe(countBeforeUnmount);
  }, 10_000);
});
