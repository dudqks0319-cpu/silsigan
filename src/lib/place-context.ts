import type { Place } from "./domain.ts";

export type PlaceWeatherContext = {
  alertLevel: "none" | "watch" | "warning";
  shortLabel: string;
  summary: string;
  temperatureC: number | null;
  rainChancePercent: number | null;
  windSpeedMs: number | null;
  updatedAt: string;
  source: string;
};

export type NearbyAttraction = {
  title: string;
  kind: "관광지" | "축제" | "맛집" | "주차";
  distanceLabel: string;
  summary: string;
  source: string;
};

export type AirQualityContext = {
  grade: "좋음" | "보통" | "나쁨" | "매우 나쁨" | "확인 중";
  summary: string;
  updatedAt: string;
  source: string;
};

export type ParkingContext = {
  summary: string;
  lots: {
    name: string;
    distanceLabel: string;
    spacesLabel: string;
  }[];
  source: string;
};

export type TourismDemandContext = {
  level: "low" | "normal" | "high";
  label: string;
  summary: string;
  source: string;
};

export type PlaceContext = {
  placeId: string;
  weather: PlaceWeatherContext;
  nearbyAttractions: NearbyAttraction[];
  airQuality: AirQualityContext;
  parking: ParkingContext;
  tourismDemand: TourismDemandContext;
};

export type PlaceContextMap = Record<string, PlaceContext>;

type KmaItem = {
  category?: string;
  fcstValue?: string;
};

type TourItem = {
  title?: string;
  contenttypeid?: string;
  dist?: string;
  addr1?: string;
};

const placeFallbackContexts: Record<string, PlaceContext> = {
  "ulsan-taehwagang": {
    placeId: "ulsan-taehwagang",
    weather: {
      alertLevel: "watch",
      shortLabel: "바람 확인",
      summary: "강변은 바람이 체감될 수 있어 겉옷을 챙기는 편이 좋아요.",
      temperatureC: 19,
      rainChancePercent: 20,
      windSpeedMs: 4.2,
      updatedAt: "방금 갱신",
      source: "기상청 초단기예보 fallback",
    },
    nearbyAttractions: [
      {
        title: "태화강 국가정원 십리대숲",
        kind: "관광지",
        distanceLabel: "도보권",
        summary: "산책 동선과 함께 확인하기 좋아요.",
        source: "한국관광공사 TourAPI fallback",
      },
      {
        title: "태화강 전망대",
        kind: "관광지",
        distanceLabel: "1.1km",
        summary: "날씨가 좋으면 함께 들르기 좋아요.",
        source: "한국관광공사 TourAPI fallback",
      },
    ],
    airQuality: {
      grade: "보통",
      summary: "야외 활동 전 미세먼지 예보를 한 번 더 확인하세요.",
      updatedAt: "오늘 기준",
      source: "에어코리아 fallback",
    },
    parking: {
      summary: "주말 오후에는 국가정원 주변 주차장이 빠르게 찰 수 있어요.",
      lots: [
        { name: "태화강 국가정원 공영주차장", distanceLabel: "가까움", spacesLabel: "대형 주차장" },
        { name: "태화강 둔치 임시주차장", distanceLabel: "도보권", spacesLabel: "혼잡 시 대안" },
      ],
      source: "지자체 공영주차장 fallback",
    },
    tourismDemand: {
      level: "high",
      label: "관광 관심도 높음",
      summary: "산책·정원 관광 수요가 높은 지역으로 주말 현장 제보가 중요해요.",
      source: "한국관광공사 관광 자원 수요 fallback",
    },
  },
  "busan-gwangalli": {
    placeId: "busan-gwangalli",
    weather: {
      alertLevel: "warning",
      shortLabel: "해변 바람 강함",
      summary: "해변 체감 바람과 주차 혼잡을 같이 확인하세요.",
      temperatureC: 20,
      rainChancePercent: 30,
      windSpeedMs: 6.1,
      updatedAt: "방금 갱신",
      source: "기상청 초단기예보 fallback",
    },
    nearbyAttractions: [
      {
        title: "광안리해수욕장 야간 경관",
        kind: "관광지",
        distanceLabel: "현재 장소",
        summary: "사진 제보와 혼잡도를 같이 보면 좋아요.",
        source: "한국관광공사 TourAPI fallback",
      },
      {
        title: "민락수변공원",
        kind: "관광지",
        distanceLabel: "1.3km",
        summary: "해변 혼잡 시 대체 동선으로 확인해 보세요.",
        source: "한국관광공사 TourAPI fallback",
      },
    ],
    airQuality: {
      grade: "보통",
      summary: "해안가 바람이 강한 날에는 체감 온도가 낮아질 수 있어요.",
      updatedAt: "오늘 기준",
      source: "에어코리아 fallback",
    },
    parking: {
      summary: "공영주차장 만차 가능성이 높아 길찾기 전 제보를 확인하세요.",
      lots: [
        { name: "광안리 공영주차장", distanceLabel: "가까움", spacesLabel: "만차 잦음" },
        { name: "민락매립지 공영주차장", distanceLabel: "1km 내외", spacesLabel: "대안 주차" },
      ],
      source: "부산 공영주차장 API fallback",
    },
    tourismDemand: {
      level: "high",
      label: "관광 관심도 매우 높음",
      summary: "해변·야간 경관 수요가 높아 사진 제보와 주차 제보 가치가 큽니다.",
      source: "한국관광공사 관광 자원 수요 fallback",
    },
  },
  "gyeongju-hwangridan": {
    placeId: "gyeongju-hwangridan",
    weather: {
      alertLevel: "none",
      shortLabel: "걷기 무난",
      summary: "골목 이동은 무난하지만 인기 카페 대기 제보를 확인하세요.",
      temperatureC: 21,
      rainChancePercent: 10,
      windSpeedMs: 2.1,
      updatedAt: "방금 갱신",
      source: "기상청 초단기예보 fallback",
    },
    nearbyAttractions: [
      {
        title: "첨성대",
        kind: "관광지",
        distanceLabel: "900m",
        summary: "황리단길과 함께 묶어 보기 좋아요.",
        source: "한국관광공사 TourAPI fallback",
      },
      {
        title: "대릉원",
        kind: "관광지",
        distanceLabel: "도보권",
        summary: "주말에는 입구 주변 혼잡을 확인하세요.",
        source: "한국관광공사 TourAPI fallback",
      },
    ],
    airQuality: {
      grade: "좋음",
      summary: "야외 이동하기 좋은 편입니다.",
      updatedAt: "오늘 기준",
      source: "에어코리아 fallback",
    },
    parking: {
      summary: "골목 안 주차보다 외곽 주차 후 도보 이동이 안전해요.",
      lots: [
        { name: "황리단길 공영주차장", distanceLabel: "가까움", spacesLabel: "혼잡 잦음" },
        { name: "대릉원 주변 주차장", distanceLabel: "도보권", spacesLabel: "대안 주차" },
      ],
      source: "지자체 공영주차장 fallback",
    },
    tourismDemand: {
      level: "high",
      label: "관광 관심도 높음",
      summary: "카페·골목 관광 수요가 높아 웨이팅 제보가 특히 유용해요.",
      source: "한국관광공사 관광 자원 수요 fallback",
    },
  },
  "ulsan-city-hall": {
    placeId: "ulsan-city-hall",
    weather: {
      alertLevel: "none",
      shortLabel: "방문 무난",
      summary: "민원 방문 전 대기와 주차 상태를 같이 확인하세요.",
      temperatureC: 20,
      rainChancePercent: 20,
      windSpeedMs: 2.4,
      updatedAt: "방금 갱신",
      source: "기상청 초단기예보 fallback",
    },
    nearbyAttractions: [
      {
        title: "울산대공원",
        kind: "관광지",
        distanceLabel: "2km 내외",
        summary: "민원 방문 뒤 산책 코스로 확인할 수 있어요.",
        source: "한국관광공사 TourAPI fallback",
      },
    ],
    airQuality: {
      grade: "보통",
      summary: "대기질이 나쁜 날에는 실내 대기 중심으로 확인하세요.",
      updatedAt: "오늘 기준",
      source: "에어코리아 fallback",
    },
    parking: {
      summary: "평일 오전 민원 시간대에는 청사 주변 주차 부족 가능성이 있어요.",
      lots: [
        { name: "울산시청 부설주차장", distanceLabel: "현재 장소", spacesLabel: "평일 혼잡" },
        { name: "인근 공영주차장", distanceLabel: "도보권", spacesLabel: "대안 주차" },
      ],
      source: "지자체 공영주차장 fallback",
    },
    tourismDemand: {
      level: "normal",
      label: "생활 방문 중심",
      summary: "관광보다 민원·주차·대기 제보가 더 중요한 장소입니다.",
      source: "한국관광공사 관광 자원 수요 fallback",
    },
  },
};

export async function getPlaceContexts(places: Place[]): Promise<PlaceContextMap> {
  const entries = await Promise.all(places.map(async (place) => [place.id, await getPlaceContext(place)] as const));

  return Object.fromEntries(entries);
}

export async function getPlaceContext(place: Place): Promise<PlaceContext> {
  const fallback = fallbackContextForPlace(place);

  if (process.env.PLACE_CONTEXT_EXTERNAL_APIS !== "true") {
    return fallback;
  }

  const [weather, attractions, airQuality] = await Promise.all([
    fetchKmaWeather(place).catch(() => fallback.weather),
    fetchTourApiAttractions(place).catch(() => fallback.nearbyAttractions),
    fetchAirKoreaQuality(place).catch(() => fallback.airQuality),
  ]);

  return {
    ...fallback,
    weather,
    nearbyAttractions: attractions.length > 0 ? attractions : fallback.nearbyAttractions,
    airQuality,
  };
}

function fallbackContextForPlace(place: Place): PlaceContext {
  return (
    placeFallbackContexts[place.id] ?? {
      placeId: place.id,
      weather: {
        alertLevel: "none",
        shortLabel: "날씨 확인",
        summary: "오늘 날씨는 출발 전 한 번 더 확인하세요.",
        temperatureC: null,
        rainChancePercent: null,
        windSpeedMs: null,
        updatedAt: "확인 중",
        source: "기상청 초단기예보 fallback",
      },
      nearbyAttractions: [],
      airQuality: {
        grade: "확인 중",
        summary: "대기질 정보를 확인하고 있습니다.",
        updatedAt: "확인 중",
        source: "에어코리아 fallback",
      },
      parking: {
        summary: "주차 정보는 현장 제보와 함께 확인하세요.",
        lots: [],
        source: "공영주차장 fallback",
      },
      tourismDemand: {
        level: "normal",
        label: "관심도 확인 중",
        summary: "최근 제보와 질문을 기준으로 현장성을 판단합니다.",
        source: "한국관광공사 관광 자원 수요 fallback",
      },
    }
  );
}

async function fetchKmaWeather(place: Place): Promise<PlaceWeatherContext> {
  const serviceKey = process.env.KMA_SHORT_TERM_SERVICE_KEY ?? process.env.KOREA_DATA_API_KEY;
  if (!serviceKey) {
    throw new Error("KMA service key missing");
  }

  const grid = toKmaGrid(place.latitude, place.longitude);
  const base = kmaUltraShortBaseTime();
  const url = new URL("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "60");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", base.date);
  url.searchParams.set("base_time", base.time);
  url.searchParams.set("nx", String(grid.x));
  url.searchParams.set("ny", String(grid.y));

  const payload = await fetchExternalJson(url);
  const items = extractOpenApiItems<KmaItem>(payload);
  const firstByCategory = new Map(items.map((item) => [item.category, item.fcstValue ?? ""]));
  const temperatureC = numberOrNull(firstByCategory.get("T1H"));
  const rainChancePercent = numberOrNull(firstByCategory.get("POP"));
  const windSpeedMs = numberOrNull(firstByCategory.get("WSD"));
  const pty = firstByCategory.get("PTY");
  const sky = firstByCategory.get("SKY");
  const rainLabel = rainTypeLabel(pty);
  const skyLabel = skyLabelForCode(sky);
  const alertLevel = weatherAlertLevel(rainLabel, rainChancePercent, windSpeedMs);

  return {
    alertLevel,
    shortLabel: rainLabel !== "강수 없음" ? rainLabel : windSpeedMs && windSpeedMs >= 5 ? "바람 강함" : skyLabel,
    summary: weatherSummary({ rainLabel, rainChancePercent, windSpeedMs, temperatureC, skyLabel }),
    temperatureC,
    rainChancePercent,
    windSpeedMs,
    updatedAt: "기상청 기준",
    source: "기상청 초단기예보",
  };
}

async function fetchTourApiAttractions(place: Place): Promise<NearbyAttraction[]> {
  const serviceKey = process.env.TOUR_API_SERVICE_KEY ?? process.env.KOREA_DATA_API_KEY;
  if (!serviceKey) {
    throw new Error("TourAPI service key missing");
  }

  const url = new URL("https://apis.data.go.kr/B551011/KorService1/locationBasedList1");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "Silsigan");
  url.searchParams.set("_type", "json");
  url.searchParams.set("arrange", "S");
  url.searchParams.set("numOfRows", "5");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("mapX", String(place.longitude));
  url.searchParams.set("mapY", String(place.latitude));
  url.searchParams.set("radius", "1800");

  const payload = await fetchExternalJson(url);
  const items = extractOpenApiItems<TourItem>(payload);

  return items
    .filter((item) => item.title)
    .slice(0, 3)
    .map((item) => ({
      title: item.title as string,
      kind: tourContentKind(item.contenttypeid),
      distanceLabel: item.dist ? `${Math.round(Number(item.dist))}m` : "근처",
      summary: item.addr1 ? item.addr1 : "근처에서 함께 확인하기 좋은 장소입니다.",
      source: "한국관광공사 TourAPI",
    }));
}

async function fetchAirKoreaQuality(place: Place): Promise<AirQualityContext> {
  const serviceKey = process.env.AIRKOREA_SERVICE_KEY ?? process.env.KOREA_DATA_API_KEY;
  if (!serviceKey) {
    throw new Error("AirKorea service key missing");
  }

  const stationName = airStationNameForPlace(place);
  const url = new URL("https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("numOfRows", "1");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("stationName", stationName);
  url.searchParams.set("dataTerm", "DAILY");
  url.searchParams.set("ver", "1.3");

  const payload = await fetchExternalJson(url);
  const [item] = extractOpenApiItems<Record<string, string>>(payload);
  const grade = airGradeLabel(item?.khaiGrade);

  return {
    grade,
    summary: item?.dataTime ? `${stationName} 측정소 ${item.dataTime} 기준` : `${stationName} 측정소 기준`,
    updatedAt: item?.dataTime ?? "에어코리아 기준",
    source: "에어코리아 대기오염정보",
  };
}

async function fetchExternalJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Open API request failed: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenApiItems<TItem>(payload: unknown): TItem[] {
  const body = (payload as { response?: { body?: { items?: { item?: TItem | TItem[] } } } }).response?.body;
  const item = body?.items?.item;

  if (!item) {
    return [];
  }

  return Array.isArray(item) ? item : [item];
}

function toKmaGrid(latitude: number, longitude: number) {
  const earthRadiusKm = 6371.00877;
  const gridKm = 5.0;
  const standardParallel1 = (30.0 * Math.PI) / 180.0;
  const standardParallel2 = (60.0 * Math.PI) / 180.0;
  const originLongitude = (126.0 * Math.PI) / 180.0;
  const originLatitude = (38.0 * Math.PI) / 180.0;
  const originX = 43;
  const originY = 136;
  const re = earthRadiusKm / gridKm;
  const sn =
    Math.log(Math.cos(standardParallel1) / Math.cos(standardParallel2)) /
    Math.log(Math.tan(Math.PI * 0.25 + standardParallel2 * 0.5) / Math.tan(Math.PI * 0.25 + standardParallel1 * 0.5));
  const sf = (Math.tan(Math.PI * 0.25 + standardParallel1 * 0.5) ** sn * Math.cos(standardParallel1)) / sn;
  const ro = re * sf / Math.tan(Math.PI * 0.25 + originLatitude * 0.5) ** sn;
  const ra = re * sf / Math.tan(Math.PI * 0.25 + (latitude * Math.PI) / 180.0 * 0.5) ** sn;
  let theta = (longitude * Math.PI) / 180.0 - originLongitude;

  if (theta > Math.PI) {
    theta -= 2.0 * Math.PI;
  }

  if (theta < -Math.PI) {
    theta += 2.0 * Math.PI;
  }

  theta *= sn;

  return {
    x: Math.floor(ra * Math.sin(theta) + originX + 0.5),
    y: Math.floor(ro - ra * Math.cos(theta) + originY + 0.5),
  };
}

function kmaUltraShortBaseTime(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let hour = kst.getUTCHours();

  if (kst.getUTCMinutes() < 45) {
    hour -= 1;
  }

  if (hour < 0) {
    kst.setUTCDate(kst.getUTCDate() - 1);
    hour = 23;
  }

  return {
    date: `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, "0")}${String(kst.getUTCDate()).padStart(2, "0")}`,
    time: `${String(hour).padStart(2, "0")}00`,
  };
}

function numberOrNull(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rainTypeLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    "0": "강수 없음",
    "1": "비 예보",
    "2": "비/눈 예보",
    "3": "눈 예보",
    "5": "빗방울",
    "6": "빗방울/눈날림",
    "7": "눈날림",
  };

  return labels[value ?? "0"] ?? "강수 확인";
}

function skyLabelForCode(value: string | undefined) {
  const labels: Record<string, string> = {
    "1": "맑음",
    "3": "구름 많음",
    "4": "흐림",
  };

  return labels[value ?? ""] ?? "하늘 상태 확인";
}

function weatherAlertLevel(rainLabel: string, rainChancePercent: number | null, windSpeedMs: number | null): PlaceWeatherContext["alertLevel"] {
  if (rainLabel !== "강수 없음" || (rainChancePercent ?? 0) >= 70 || (windSpeedMs ?? 0) >= 6) {
    return "warning";
  }

  if ((rainChancePercent ?? 0) >= 40 || (windSpeedMs ?? 0) >= 4) {
    return "watch";
  }

  return "none";
}

function weatherSummary({
  rainLabel,
  rainChancePercent,
  windSpeedMs,
  temperatureC,
  skyLabel,
}: {
  rainLabel: string;
  rainChancePercent: number | null;
  windSpeedMs: number | null;
  temperatureC: number | null;
  skyLabel: string;
}) {
  const parts = [temperatureC === null ? null : `${Math.round(temperatureC)}도`, skyLabel, rainLabel];

  if (rainChancePercent !== null) {
    parts.push(`강수 ${rainChancePercent}%`);
  }

  if (windSpeedMs !== null) {
    parts.push(`바람 ${windSpeedMs.toFixed(1)}m/s`);
  }

  return parts.filter(Boolean).join(" · ");
}

function tourContentKind(contentTypeId: string | undefined): NearbyAttraction["kind"] {
  if (contentTypeId === "15") {
    return "축제";
  }

  if (contentTypeId === "39") {
    return "맛집";
  }

  return "관광지";
}

function airStationNameForPlace(place: Place) {
  const stationByPlaceId: Record<string, string> = {
    "busan-gwangalli": "광안동",
    "gyeongju-hwangridan": "성건동",
    "ulsan-city-hall": "신정동",
    "ulsan-taehwagang": "신정동",
  };

  return stationByPlaceId[place.id] ?? (place.region === "busan" ? "광안동" : place.region === "gyeongju" ? "성건동" : "신정동");
}

function airGradeLabel(value: string | undefined): AirQualityContext["grade"] {
  const labels: Record<string, AirQualityContext["grade"]> = {
    "1": "좋음",
    "2": "보통",
    "3": "나쁨",
    "4": "매우 나쁨",
  };

  return labels[value ?? ""] ?? "확인 중";
}
