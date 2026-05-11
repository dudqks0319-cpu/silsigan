import type { LucideIcon } from "lucide-react";
import type {
  CrowdLevel,
  LineStatus,
  ParkingStatus,
  QuestionType,
  ReportCategory,
  WeatherFeel,
} from "@/lib/domain";

export type TabId = "home" | "map" | "place" | "report" | "question" | "my";

export type Place = {
  id: string;
  name: string;
  category: ReportCategory;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  status: string;
  summary: string;
  crowdLevel: CrowdLevel;
  line: string;
  parking: string;
  weather: string;
  updatedAt: string;
  reports: number;
  questions: number;
  coordinates: {
    x: number;
    y: number;
  };
  photos: string[];
  safetyWarning: string | null;
  goSignal: "제보 기준 괜찮음" | "제보 기준 애매" | "제보 기준 혼잡";
};

export type FieldOption = {
  label: string;
  value: string;
};

export type ReportDraft = {
  crowdLevel: CrowdLevel;
  lineStatus: LineStatus | "";
  parkingStatus: ParkingStatus;
  weatherFeel: WeatherFeel | "";
  comment: string;
  hasPhoto: boolean;
  photoFile: File | null;
  photoPreviewUrl: string | null;
  locationVerified: boolean;
  clientLocation: {
    latitude: number;
    longitude: number;
  } | null;
};

export type QuestionDraft = {
  type: QuestionType;
  content: string;
  isPhotoRequest: boolean;
};

export type NavItem = {
  id: TabId;
  label: string;
  icon: LucideIcon;
};
