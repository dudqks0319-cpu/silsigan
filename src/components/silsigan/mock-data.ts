import {
  CircleUserRound,
  HelpCircle,
  Home,
  Map,
  Siren
} from "lucide-react";
import type { FieldOption, NavItem } from "./types";

export const navItems: NavItem[] = [
  { id: "home", label: "홈", icon: Home },
  { id: "map", label: "내주변", icon: Map },
  { id: "report", label: "올리기", icon: Siren },
  { id: "question", label: "물어보기", icon: HelpCircle },
  { id: "my", label: "마이", icon: CircleUserRound }
];

export const crowdOptions: FieldOption[] = [
  { label: "여유", value: "quiet" },
  { label: "보통", value: "normal" },
  { label: "혼잡", value: "busy" },
  { label: "매우 혼잡", value: "packed" }
];

export const lineOptions: FieldOption[] = [
  { label: "없음", value: "none" },
  { label: "짧음", value: "short" },
  { label: "보통", value: "medium" },
  { label: "김", value: "long" }
];

export const parkingOptions: FieldOption[] = [
  { label: "가능", value: "available" },
  { label: "부족", value: "limited" },
  { label: "만차", value: "full" },
  { label: "모름", value: "unknown" }
];

export const weatherOptions: FieldOption[] = [
  { label: "좋음", value: "good" },
  { label: "비옴", value: "rainy" },
  { label: "바람셈", value: "windy" },
  { label: "더움", value: "hot" },
  { label: "추움", value: "cold" }
];

export const questionTypes: FieldOption[] = [
  { label: "혼잡도", value: "crowd" },
  { label: "줄", value: "line" },
  { label: "주차", value: "parking" },
  { label: "날씨", value: "weather" },
  { label: "사진 요청", value: "photo_request" },
  { label: "기타", value: "other" }
];
