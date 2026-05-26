"use client";

import { Zap, Globe, Palette, Brain, Shield, Download, RefreshCw, Search, Share2 } from "lucide-react";
import FadeUp from "./FadeUp";

const FEATURES = [
  {
    icon: Brain,
    title: "Claude AI-powered copy",
    desc: "Anthropic's Claude reads your experience and writes headlines, summaries, and bullet points that actually sound like you.",
    color: "var(--pf-accent)",
  },
  {
    icon: Zap,
    title: "60-second generation",
    desc: "From upload to live URL in under a minute. No waiting, no queues — just instant portfolio.",
    color: "#00d4ff",
  },
  {
    icon: Globe,
    title: "Custom domain",
    desc: "Connect your own domain or use your free vyroportify.com/[slug] URL. SSL included automatically.",
    color: "#ff6b9d",
  },
  {
    icon: Palette,
    title: "3 premium templates",
    desc: "Aurora, Minimal, Cyber — each crafted down to the last pixel. Switch templates without re-entering data.",
    color: "#00FF88",
  },
  {
    icon: Search,
    title: "SEO optimised",
    desc: "Server-side rendered with structured data, Open Graph tags, and fast Core Web Vitals out of the box.",
    color: "#ffd166",
  },
  {
    icon: RefreshCw,
    title: "Always up to date",
    desc: "Update your resume anytime and regenerate. Your URL stays the same — share it once, forever.",
    color: "var(--pf-accent)",
  },
  {
    icon: Download,
    title: "PDF export",
    desc: "Export a print-ready PDF of your portfolio with one click. Recruiters love both formats.",
    color: "#00d4ff",
  },
  {
    icon: Shield,
    title: "Privacy controls",
    desc: "Keep your portfolio private until you're ready. Publish, unpublish, or password-protect at any time.",
    color: "#ff6b9d",
  },
  {
    icon: Share2,
    title: "Analytics dashboard",
    desc: "See who's viewing your portfolio, where they're coming from, and which projects get the most clicks.",
    color: "#00FF88",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="pointer-events-none absolute left-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary opacity-5 blur-3xl" />

      <div className="mx-auto max-w-6xl">
        <FadeUp className="mb-16 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            Features
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Everything you need to get hired
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No duct tape. Every feature is built in — not bolted on.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.07}>
              <div className="group flex gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:bg-muted/40">
                <div
                  className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon className="h-5 w-5" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
