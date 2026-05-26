import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--pf-bg)] px-4 text-center">
      <p className="text-7xl font-extrabold text-[var(--pf-accent)] opacity-40">404</p>
      <h1 className="mt-4 text-2xl font-bold text-[var(--pf-text)]">Page not found</h1>
      <p className="mt-2 text-[var(--pf-muted)]">
        This portfolio may be private or doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 flex items-center gap-2 rounded-xl bg-[var(--pf-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--pf-accent-hover)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
