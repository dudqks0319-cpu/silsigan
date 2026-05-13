import { ImageResponse } from "next/og";
import { getSharePreview } from "@/lib/share-preview";

export const alt = "#실시간 현장 제보";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { placeId } = await params;
  const preview = getSharePreview(placeId) ?? {
    placeName: "#실시간",
    signal: "출발 전 확인",
    stateSummary: "지금 현장 먼저 확인",
    freshness: "방금 올라온 현장 제보",
  };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          color: "#ffffff",
          background: "linear-gradient(135deg, #0f172a 0%, #2563eb 58%, #38bdf8 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 34, fontWeight: 800, opacity: 0.9 }}>#실시간 현장 제보</div>
          <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1.08 }}>{preview.placeName}</div>
          <div
            style={{
              alignSelf: "flex-start",
              padding: "16px 22px",
              color: "#1d4ed8",
              background: "#ffffff",
              borderRadius: 999,
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            {preview.signal}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 44, fontWeight: 900 }}>{preview.stateSummary}</div>
          <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.86 }}>{preview.freshness}</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>출발 전 확인하기</div>
        </div>
      </div>
    ),
    size,
  );
}
