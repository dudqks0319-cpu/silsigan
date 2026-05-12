import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharePlaceIds, getSharePreview } from "@/lib/share-preview";
import { ShareOpenApp } from "./ShareOpenApp";

type SharePageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

export function generateStaticParams() {
  return getSharePlaceIds().map((placeId) => ({ placeId }));
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { placeId } = await params;
  const preview = getSharePreview(placeId);

  if (!preview) {
    return {
      title: "#실시간 현장 제보",
      description: "출발 전 10초, 지금 현장 먼저 확인.",
    };
  }

  const title = `#실시간 | ${preview.placeName} ${preview.signal}`;
  const description = `${preview.stateSummary} · ${preview.freshness}`;
  const url = `/share/${preview.placeId}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "#실시간",
      type: "website",
      images: [
        {
          url: `${url}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${preview.placeName} 실시간 현장 공유 카드`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${url}/opengraph-image`],
    },
  };
}

export default async function SharePlacePage({ params }: SharePageProps) {
  const { placeId } = await params;
  const preview = getSharePreview(placeId);

  if (!preview) {
    notFound();
  }

  const appHref = `/?place=${encodeURIComponent(preview.placeId)}&from=share`;

  return (
    <main className="share-landing-page">
      <section>
        <p className="eyebrow">친구가 공유한 현장</p>
        <h1>{preview.placeName}</h1>
        <strong>{preview.signal}</strong>
        <p>{preview.stateSummary}</p>
        <span>{preview.freshness}</span>
        <p>{preview.description}</p>
        <ShareOpenApp href={appHref} />
      </section>
    </main>
  );
}
