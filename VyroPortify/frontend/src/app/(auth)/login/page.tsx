"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const { isLight } = useTheme();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1
          className="text-2xl font-bold transition-colors duration-300"
          style={{ color: isLight ? "#1a1a2e" : "var(--pf-text)" }}
        >
          Welcome back
        </h1>
        <p
          className="mt-1 text-sm transition-colors duration-300"
          style={{ color: isLight ? "#666688" : "var(--pf-muted)" }}
        >
          Sign in to your VyroPortify account
        </p>
      </div>
      <SignIn
        routing="hash"
        signUpUrl="/register"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorBackground: isLight ? "#ffffff" : "var(--pf-surface)",
            colorInputBackground: isLight ? "#f5f5f7" : "#1a1a2e",
            colorInputText: isLight ? "#1a1a2e" : "var(--pf-text)",
            colorText: isLight ? "#1a1a2e" : "var(--pf-text)",
            colorTextSecondary: isLight ? "#666688" : "var(--pf-muted)",
            colorPrimary: "var(--pf-accent)",
            colorDanger: "#ff4d4d",
            borderRadius: "10px",
            fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
          },
          elements: {
            rootBox: "w-full",
            card: `w-full shadow-lg rounded-2xl border transition-colors duration-300 ${
              isLight
                ? "bg-white border-[rgba(0,0,0,0.08)] shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
                : "bg-[var(--pf-surface)] border-[var(--pf-accent-soft)] shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
            }`,
            formButtonPrimary:
              "bg-[var(--pf-accent)] hover:bg-[var(--pf-accent-hover)] text-white font-semibold shadow-[0_0_16px_var(--pf-border-hover)]",
            socialButtonsBlockButton: isLight
              ? "border-[rgba(0,0,0,0.1)] bg-[#f5f5f7] text-[#1a1a2e] hover:bg-[#ebebf0]"
              : "border-[var(--pf-border-light)] bg-[#1a1a2e] text-[var(--pf-text)] hover:bg-[var(--pf-border-dim)]",
            footerActionLink: "text-[var(--pf-accent)] hover:text-[var(--pf-accent-text)]",
            formFieldInput: isLight
              ? "bg-[#f5f5f7] border-[rgba(0,0,0,0.1)] text-[#1a1a2e] focus:border-[var(--pf-accent)]"
              : "bg-[#1a1a2e] border-[var(--pf-border-light)] text-[var(--pf-text)] focus:border-[var(--pf-accent)]",
          },
        }}
      />
    </div>
  );
}
