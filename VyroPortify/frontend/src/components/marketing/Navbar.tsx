"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Zap, Menu, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#templates", label: "Templates" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLight } = useTheme();
  const { user, isLoaded } = useUser();
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isSignedIn = isLoaded && !!user;

  return (
    <header className="fixed top-0 z-50 w-full">
      <motion.div
        className="absolute inset-0 border-b backdrop-blur-xl transition-colors duration-300"
        style={{
          opacity: bgOpacity,
          background: isLight ? "rgba(245,245,247,0.92)" : "rgba(15,15,26,0.92)",
          borderColor: isLight ? "rgba(0,0,0,0.06)" : "var(--pf-border-dim)",
        }}
      />

      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pf-accent)] shadow-[0_0_20px_rgba(108,99,255,0.5)]"
          >
            <Zap className="h-4 w-4 text-white" />
          </motion.div>
          <span
            className="text-lg font-bold tracking-tight transition-colors duration-300"
            style={{ color: isLight ? "#1a1a2e" : "#ffffff" }}
          >
            Portify<span className="text-[var(--pf-accent)]">AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
              style={{ color: isLight ? "#666688" : "#9999bb" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isLight ? "#1a1a2e" : "#ffffff";
                e.currentTarget.style.background = isLight
                  ? "var(--pf-border-faint)"
                  : "var(--pf-border-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isLight ? "#666688" : "#9999bb";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle compact />

          {!isLoaded ? (
            /* Loading skeleton */
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 animate-pulse rounded-full"
                style={{ background: isLight ? "#e5e5ea" : "var(--pf-accent-soft)" }}
              />
              <div
                className="h-4 w-16 animate-pulse rounded"
                style={{ background: isLight ? "#e5e5ea" : "var(--pf-accent-soft)" }}
              />
            </div>
          ) : isSignedIn ? (
            <ProfileDropdown />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium transition-colors"
                style={{ color: isLight ? "#666688" : "#9999bb" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isLight ? "#1a1a2e" : "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isLight ? "#666688" : "#9999bb";
                }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-[var(--pf-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,99,255,0.35)] transition-all hover:bg-[var(--pf-accent-hover)] hover:shadow-[0_0_28px_rgba(108,99,255,0.55)]"
              >
                Get started free
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle compact />
          {isSignedIn && <ProfileDropdown />}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 transition-colors"
            style={{ color: isLight ? "#666688" : "#9999bb" }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden border-b md:hidden"
            style={{
              background: isLight ? "#f5f5f7" : "#0F0F1A",
              borderColor: isLight ? "rgba(0,0,0,0.06)" : "var(--pf-accent-subtle)",
            }}
          >
            <div className="px-6 pb-6 pt-2">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-sm font-medium transition-colors"
                  style={{ color: isLight ? "#666688" : "#9999bb" }}
                >
                  {l.label}
                </Link>
              ))}
              {!isSignedIn && (
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="text-center text-sm font-medium"
                    style={{ color: isLight ? "#666688" : "#9999bb" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-xl bg-[var(--pf-accent)] py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Get started free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
