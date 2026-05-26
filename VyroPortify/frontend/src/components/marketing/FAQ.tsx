"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import FadeUp from "./FadeUp";

const FAQS = [
  {
    q: "How does the AI portfolio generation work?",
    a: "You upload a PDF resume or complete our 12-question builder. Claude AI (Anthropic's model) parses your experience, writes polished copy, and our engine renders it into a pixel-perfect portfolio using your chosen template. The whole process takes under 60 seconds.",
  },
  {
    q: "Do I need to know how to code or design?",
    a: "Not at all. VyroPortify is built for people who want a stunning portfolio without touching HTML or Figma. Everything — layout, typography, color, responsiveness — is handled for you.",
  },
  {
    q: "Can I edit the content after it's generated?",
    a: "Yes. After generation you can edit any section inline — headline, bio, skills, project descriptions, and links. Changes save in real time. You can also regenerate the AI copy at any time.",
  },
  {
    q: "What's included in the free plan?",
    a: "The free plan gives you one portfolio with all three templates, a vyroportify.com/[slug] URL, and PDF export. It's genuinely useful — not a crippled demo. Upgrade to Pro for custom domains, analytics, and unlimited portfolios.",
  },
  {
    q: "Can I use my own domain name?",
    a: "Yes — on the Pro and Lifetime plans you can connect any domain you own. We walk you through adding a CNAME record (takes about 2 minutes), and SSL is provisioned automatically.",
  },
  {
    q: "Is my resume data kept private?",
    a: "Your data is encrypted at rest and in transit. Portfolios are private by default — you control when to publish. We never sell or share your data with third parties. You can delete your account and all associated data at any time.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative px-6 py-28">
      <div className="mx-auto max-w-3xl">
        <FadeUp className="mb-14 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            FAQ
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Questions & answers
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Accordion.Root type="multiple" className="space-y-3">
            {FAQS.map((faq, i) => (
              <Accordion.Item
                key={i}
                value={`faq-${i}`}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/30"
              >
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-semibold text-foreground">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-primary transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
                <Accordion.Content className="overflow-hidden text-sm leading-relaxed text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="px-6 pb-5">{faq.a}</div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </FadeUp>
      </div>
    </section>
  );
}
