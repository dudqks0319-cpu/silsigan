import type {
  CrowdLevel,
  LineStatus,
  ParkingStatus,
  QuestionType,
  ReportCategory,
  WeatherFeel,
} from "@/lib/domain";

export const crowdLabels: Record<CrowdLevel, string> = {
  quiet: "여유",
  normal: "보통",
  busy: "혼잡",
  packed: "매우 혼잡",
};

export const lineLabels: Record<LineStatus, string> = {
  none: "없음",
  short: "짧음",
  medium: "보통",
  long: "김",
};

export const parkingLabels: Record<ParkingStatus, string> = {
  available: "가능",
  limited: "부족",
  full: "만차",
  unknown: "모름",
};

export const weatherLabels: Record<WeatherFeel, string> = {
  good: "좋음",
  rainy: "비옴",
  windy: "바람셈",
  hot: "더움",
  cold: "추움",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  crowd: "혼잡도",
  line: "줄",
  parking: "주차",
  weather: "날씨",
  photo_request: "사진 요청",
  other: "기타",
};

export const categoryLabels: Record<ReportCategory, string> = {
  tourism: "관광지",
  festival: "축제",
  restaurant_cafe: "맛집/카페",
  hospital: "병원",
  public_office: "관공서",
  parking: "주차장",
};
