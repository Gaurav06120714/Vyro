import Navbar from "@/components/marketing/Navbar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0F0F1A]">
      <Navbar />
      {children}
    </div>
  );
}
