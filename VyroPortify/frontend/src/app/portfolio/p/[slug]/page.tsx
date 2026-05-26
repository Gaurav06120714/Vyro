import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchPortfolio(slug: string) {
  try {
    const res = await fetch(`${BASE_URL}/portfolio/p/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ html_url: string | null; status: string }>;
  } catch {
    return null;
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params;
  const portfolio = await fetchPortfolio(slug);

  if (!portfolio || portfolio.status !== "published" || !portfolio.html_url) {
    notFound();
  }

  // Proxy-render the HTML via an iframe pointed at the S3 URL
  return (
    <iframe
      src={portfolio.html_url}
      className="h-dvh w-full border-0"
      title="Portfolio"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
