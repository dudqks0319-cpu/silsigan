export type SharePlacePreview = {
  placeId: string;
  placeName: string;
  signal: string;
  stateSummary: string;
  freshness: string;
  description: string;
};

const sharePlacePreviews: Record<string, SharePlacePreview> = {
  "ulsan-taehwagang": {
    placeId: "ulsan-taehwagang",
    placeName: "태화강 국가정원",
    signal: "제보 기준 괜찮음",
    stateSummary: "주차 부족 · 사람 보통",
    freshness: "4분 전 · 현장 인증 · 사진 있음",
    description: "잔디광장은 여유 있는데 주차장은 조금 붐벼요.",
  },
  "busan-gwangalli": {
    placeId: "busan-gwangalli",
    placeName: "광안리해수욕장",
    signal: "제보 기준 혼잡",
    stateSummary: "주차 만차 · 사람 매우 혼잡",
    freshness: "8분 전 · 현장 인증 · 사진 있음",
    description: "해변 앞 보행 통로가 막히기 시작했고 공영주차장은 만차예요.",
  },
  "gyeongju-hwangridan": {
    placeId: "gyeongju-hwangridan",
    placeName: "황리단길",
    signal: "제보 기준 애매",
    stateSummary: "주차 부족 · 사람 혼잡",
    freshness: "12분 전 · 현장 인증 · 사진 있음",
    description: "인기 카페는 20분 정도 기다리고 골목 이동은 가능해요.",
  },
  "ulsan-city-hall": {
    placeId: "ulsan-city-hall",
    placeName: "울산광역시청",
    signal: "제보 기준 괜찮음",
    stateSummary: "주차 부족 · 사람 보통",
    freshness: "16분 전 · 현장 인증 · 사진 없음",
    description: "민원 창구 대기는 많지 않고 주차장은 입구 쪽이 붐벼요.",
  },
};

export function getSharePlaceIds() {
  return Object.keys(sharePlacePreviews);
}

export function getSharePreview(placeId: string) {
  return sharePlacePreviews[placeId] ?? null;
}
