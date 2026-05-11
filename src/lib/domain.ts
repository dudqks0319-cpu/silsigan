export const REPORT_TTL_HOURS = 3;

export const reportCategories = [
  "tourism",
  "festival",
  "restaurant_cafe",
  "hospital",
  "public_office",
  "parking",
] as const;

export type ReportCategory = (typeof reportCategories)[number];

export const sensitiveCategories = ["hospital", "public_office"] as const;

export type SensitiveCategory = (typeof sensitiveCategories)[number];

export const crowdLevels = ["quiet", "normal", "busy", "packed"] as const;
export type CrowdLevel = (typeof crowdLevels)[number];

export const lineStatuses = ["none", "short", "medium", "long"] as const;
export type LineStatus = (typeof lineStatuses)[number];

export const parkingStatuses = ["available", "limited", "full", "unknown"] as const;
export type ParkingStatus = (typeof parkingStatuses)[number];

export const weatherFeels = ["good", "rainy", "windy", "hot", "cold"] as const;
export type WeatherFeel = (typeof weatherFeels)[number];

export const questionTypes = ["crowd", "line", "parking", "weather", "photo_request", "other"] as const;
export type QuestionType = (typeof questionTypes)[number];

export const flagReasons = [
  "false_content",
  "spam",
  "privacy_face",
  "privacy_plate",
  "sensitive_info",
  "other",
] as const;
export type FlagReason = (typeof flagReasons)[number];

export type CreditEventType =
  | "signup_bonus"
  | "verified_report"
  | "photo_report"
  | "answer_question"
  | "ask_question"
  | "ask_photo_request"
  | "confirmed_false_report";

export type CreditEvent = {
  type: CreditEventType;
  amount: number;
};

export type Place = {
  id: string;
  name: string;
  address: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
  region: "ulsan" | "busan" | "gyeongju";
};

export type VerifiedRadiusM = 50 | 150 | 300;

export type StoredReport = {
  id: string;
  placeId: string;
  category: ReportCategory;
  crowdLevel: CrowdLevel;
  lineStatus: LineStatus;
  parkingStatus: ParkingStatus;
  weatherFeel: WeatherFeel;
  comment: string | null;
  photoUrl: string | null;
  verifiedRadiusM: VerifiedRadiusM | null;
  locationVerified: boolean;
  createdAt: string;
  expiresAt: string;
  flagCount: number;
  hiddenAt: string | null;
};

export type StoredQuestion = {
  id: string;
  placeId: string;
  questionType: QuestionType;
  body: string;
  creditCost: 1 | 2;
  answeredReportId: string | null;
  createdAt: string;
};

export function getCategorySafetyWarning(category: ReportCategory): string | null {
  if (category === "hospital") {
    return "병원 제보에는 환자 얼굴, 접수번호, 진료 정보, 의료진 개인정보가 보이지 않게 촬영해 주세요.";
  }

  if (category === "public_office") {
    return "관공서 제보에는 민원인 얼굴, 서류, 차량번호, 창구 개인정보가 보이지 않게 촬영해 주세요.";
  }

  return null;
}

export function getReportExpiry(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + REPORT_TTL_HOURS * 60 * 60 * 1000);
}

export function isReportExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function getQuestionCost(questionType: QuestionType): 1 | 2 {
  return questionType === "photo_request" ? 2 : 1;
}

export function calculateCreditBalance(events: CreditEvent[]): number {
  return events.reduce((balance, event) => balance + event.amount, 0);
}

export function creditEventForQuestion(questionType: QuestionType): CreditEvent {
  const cost = getQuestionCost(questionType);

  return {
    type: questionType === "photo_request" ? "ask_photo_request" : "ask_question",
    amount: -cost,
  };
}

export function creditEventsForReport(hasVerifiedLocation: boolean, hasPhoto: boolean): CreditEvent[] {
  const events: CreditEvent[] = [];

  if (hasVerifiedLocation) {
    events.push({ type: "verified_report", amount: 1 });

    if (hasPhoto) {
      events.push({ type: "photo_report", amount: 1 });
    }
  }

  return events;
}

export function shouldHideForFlags(flagReasonsToReview: FlagReason[]): boolean {
  const privacyFlags = flagReasonsToReview.filter((reason) =>
    ["privacy_face", "privacy_plate", "sensitive_info"].includes(reason),
  ).length;
  const falseContentFlags = flagReasonsToReview.filter((reason) => reason === "false_content").length;

  return privacyFlags >= 1 || falseContentFlags >= 2 || flagReasonsToReview.length >= 3;
}

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusM = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusM * c;
}

export function verifiedRadiusFromDistance(distanceM: number): VerifiedRadiusM | null {
  if (distanceM <= 50) {
    return 50;
  }

  if (distanceM <= 150) {
    return 150;
  }

  if (distanceM <= 300) {
    return 300;
  }

  return null;
}
