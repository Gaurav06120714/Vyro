"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Sparkles, Globe } from "lucide-react";
import FadeUp from "./FadeUp";

const STEPS = [
  {
    n: "01",
    icon: Upload,
    title: "Add your experience",
    body: "Upload a PDF resume or fill out our 12-question AI Resume Builder. Takes less than 5 minutes — we handle the rest.",
    color: "var(--pf-accent)",
    glow: "rgba(108,99,255,0.35)",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "Claude AI writes your copy",
    body: "Our Claude AI parses your experience, writes a compelling headline, polishes your bullet points, and suggests skills you might have missed.",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.35)",
  },
  {
    n: "03",
    icon: Globe,
    title: "Share your live portfolio",
    body: "Pick a template (Aurora, Minimal, or Cyber), hit generate, and get a shareable URL in under 60 seconds. No design skills needed.",
    color: "#ff6b9d",
    glow: "rgba(255,107,157,0.35)",
  },
];

function StepCard({ step, index }: { step: (typeof STEPS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative flex flex-col gap-5 rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:border-primary/30"
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 50% 0%, ${step.glow} 0%, transparent 60%)` }}
      />

      {/* Step number */}
      <div className="flex items-center justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
        >
          <step.icon className="h-5 w-5" style={{ color: step.color }} />
        </div>
        <span
          className="font-mono text-5xl font-extrabold"
          style={{ color: `${step.color}20` }}
        >
          {step.n}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </div>

      {/* Connector line (not last) */}
      {index < 2 && (
        <div
          className="absolute -right-px top-1/2 hidden h-px w-8 -translate-y-1/2 translate-x-full bg-border lg:block"
        />
      )}
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-28">
      {/* Section glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary opacity-5 blur-3xl" />

      <div className="mx-auto max-w-6xl">
        <FadeUp className="mb-16 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            How it works
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Portfolio in three steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No design tool. No HTML. No waiting. Just your experience, transformed.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.n} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
