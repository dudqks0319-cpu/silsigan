import {
  type FlagReason,
  type Place,
  type StoredQuestion,
  type StoredReport,
  creditEventForQuestion,
  creditEventsForReport,
  distanceMeters,
  getCategorySafetyWarning,
  getQuestionCost,
  getReportExpiry,
  isReportExpired,
  shouldHideForFlags,
  verifiedRadiusFromDistance,
} from "./domain.ts";
import { ApiError } from "./errors.ts";
import type { CreateQuestionInput, CreateReportInput, FlagReportInput } from "./validators.ts";

export const mockPlaces: Place[] = [
  {
    id: "ulsan-taehwagang",
    name: "태화강 국가정원",
    address: "울산 중구 태화강국가정원길",
    category: "tourism",
    latitude: 35.5486,
    longitude: 129.3005,
    region: "ulsan",
  },
  {
    id: "busan-gwangalli",
    name: "광안리해수욕장",
    address: "부산 수영구 광안해변로",
    category: "tourism",
    latitude: 35.1532,
    longitude: 129.1186,
    region: "busan",
  },
  {
    id: "gyeongju-hwangridan",
    name: "황리단길",
    address: "경북 경주시 포석로",
    category: "restaurant_cafe",
    latitude: 35.8382,
    longitude: 129.2098,
    region: "gyeongju",
  },
  {
    id: "ulsan-city-hall",
    name: "울산광역시청",
    address: "울산 남구 중앙로 201",
    category: "public_office",
    latitude: 35.5396,
    longitude: 129.3115,
    region: "ulsan",
  },
];

const reports: StoredReport[] = [];
const questions: StoredQuestion[] = [];
const flagsByReportId = new Map<string, FlagReason[]>();

export function listPlaces() {
  return mockPlaces.map((place) => ({
    ...place,
    safetyWarning: getCategorySafetyWarning(place.category),
  }));
}

export function listReports(filters: { placeId?: string; includeExpired?: boolean } = {}) {
  const now = new Date();

  return reports.filter((report) => {
    if (filters.placeId && report.placeId !== filters.placeId) {
      return false;
    }

    if (report.hiddenAt) {
      return false;
    }

    if (!filters.includeExpired && isReportExpired(new Date(report.expiresAt), now)) {
      return false;
    }

    return true;
  });
}

export function createReport(input: CreateReportInput) {
  const place = findPlace(input.placeId);
  if (input.category !== place.category) {
    throw new ApiError(400, "CATEGORY_MISMATCH", "제보 카테고리가 장소 카테고리와 일치하지 않습니다.");
  }

  const distanceM = distanceMeters(input.clientLocation, {
    latitude: place.latitude,
    longitude: place.longitude,
  });
  const verifiedRadiusM = verifiedRadiusFromDistance(distanceM);

  if (!verifiedRadiusM) {
    throw new ApiError(403, "LOCATION_NOT_VERIFIED", "장소 300m 이내에서만 위치 인증 제보를 등록할 수 있습니다.", {
      maxRadiusM: 300,
    });
  }

  const now = new Date();
  const report: StoredReport = {
    id: `report_${crypto.randomUUID()}`,
    placeId: input.placeId,
    category: input.category,
    crowdLevel: input.crowdLevel,
    lineStatus: input.lineStatus,
    parkingStatus: input.parkingStatus,
    weatherFeel: input.weatherFeel,
    comment: input.comment || null,
    photoUrl: input.photoUrl || null,
    verifiedRadiusM,
    createdAt: now.toISOString(),
    expiresAt: getReportExpiry(now).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  };

  reports.unshift(report);

  return {
    report,
    credits: creditEventsForReport(true, Boolean(input.photoUrl)),
    safetyWarning: getCategorySafetyWarning(input.category),
    privacyNotice: "클라이언트 좌표는 반경 검증에만 사용되며 목업 저장소와 DB 모델에 저장하지 않습니다.",
  };
}

export function listQuestions(placeId?: string) {
  return questions.filter((question) => !placeId || question.placeId === placeId);
}

export function createQuestion(input: CreateQuestionInput) {
  findPlace(input.placeId);

  const creditCost = getQuestionCost(input.questionType);
  if (input.availableCredits < creditCost) {
    throw new ApiError(402, "INSUFFICIENT_CREDITS", "질문권이 부족합니다.", {
      requiredCredits: creditCost,
      availableCredits: input.availableCredits,
    });
  }

  const question: StoredQuestion = {
    id: `question_${crypto.randomUUID()}`,
    placeId: input.placeId,
    questionType: input.questionType,
    body: input.body,
    creditCost,
    createdAt: new Date().toISOString(),
  };

  questions.unshift(question);

  return {
    question,
    creditEvent: creditEventForQuestion(input.questionType),
  };
}

export function flagReport(input: FlagReportInput) {
  const report = reports.find((candidate) => candidate.id === input.reportId);
  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
  }

  const existingFlags = flagsByReportId.get(report.id) ?? [];
  const nextFlags = [...existingFlags, input.reason];
  flagsByReportId.set(report.id, nextFlags);

  report.flagCount = nextFlags.length;
  if (!report.hiddenAt && shouldHideForFlags(nextFlags)) {
    report.hiddenAt = new Date().toISOString();
  }

  return {
    reportId: report.id,
    hidden: Boolean(report.hiddenAt),
    flagCount: report.flagCount,
    hideRule: "privacy/sensitive 1건, 허위 2건, 전체 신고 3건 이상이면 자동 숨김 처리",
  };
}

function findPlace(placeId: string) {
  const place = mockPlaces.find((candidate) => candidate.id === placeId);
  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다.");
  }

  return place;
}
