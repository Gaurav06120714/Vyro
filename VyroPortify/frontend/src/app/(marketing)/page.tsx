import HeroSection from "@/components/marketing/HeroSection";
import LogoBar from "@/components/marketing/LogoBar";
import HowItWorks from "@/components/marketing/HowItWorks";
import TemplateGallery from "@/components/marketing/TemplateGallery";
import Features from "@/components/marketing/Features";
import PricingSection from "@/components/marketing/PricingSection";
import FAQ from "@/components/marketing/FAQ";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "VyroPortify — Turn your resume into a portfolio in 60 seconds",
  description:
    "Upload a PDF or answer 12 questions. Claude AI writes your copy and renders a pixel-perfect portfolio — live in under 60 seconds. Free to start.",
};

export default function MarketingPage() {
  return (
    <main>
      <HeroSection />
      <LogoBar />
      <HowItWorks />
      <TemplateGallery />
      <Features />
      <PricingSection />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
