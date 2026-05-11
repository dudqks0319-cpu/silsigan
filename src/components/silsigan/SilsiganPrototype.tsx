"use client";

import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  LocateFixed,
  MessageCircleQuestion,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type {
  CrowdLevel,
  LineStatus,
  ParkingStatus,
  Place as ApiPlace,
  QuestionType,
  ReportCategory,
  WeatherFeel,
} from "@/lib/domain";
import { crowdOptions, lineOptions, navItems, parkingOptions, questionTypes, weatherOptions } from "./mock-data";
import type { Place, QuestionDraft, ReportDraft, TabId } from "./types";
import { ActionButton, SegmentedControl, StatusPill } from "./ui";
import { categoryLabels, crowdLabels, lineLabels, parkingLabels, questionTypeLabels, weatherLabels } from "./labels";
import { NaverMap } from "./NaverMap";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type PublicReport = {
  id: string;
  placeId: string;
  category: ReportCategory;
  crowdLevel: CrowdLevel;
  lineStatus: LineStatus;
  parkingStatus: ParkingStatus;
  weatherFeel: WeatherFeel;
  comment: string | null;
  photoUrl: string | null;
  verifiedRadiusM: 50 | 150 | 300 | null;
  locationVerified: boolean;
  createdAt: string;
  expiresAt: string;
  flagCount: number;
  hiddenAt: string | null;
};

type PublicQuestion = {
  id: string;
  placeId: string;
  questionType: QuestionType;
  body: string;
  creditCost: 1 | 2;
  answeredReportId: string | null;
  createdAt: string;
};

type ConsentAction = "photo" | "location" | "report" | "question" | "flag";

const presentationByPlaceId: Record<string, Pick<Place, "distance" | "coordinates" | "goSignal">> = {
  "ulsan-taehwagang": { distance: "1.2km", coordinates: { x: 28, y: 42 }, goSignal: "제보 기준 괜찮음" },
  "busan-gwangalli": { distance: "38km", coordinates: { x: 66, y: 34 }, goSignal: "제보 기준 혼잡" },
  "gyeongju-hwangridan": { distance: "29km", coordinates: { x: 52, y: 62 }, goSignal: "제보 기준 애매" },
  "ulsan-city-hall": { distance: "2.1km", coordinates: { x: 36, y: 74 }, goSignal: "제보 기준 괜찮음" },
};

const initialReport: ReportDraft = {
  crowdLevel: "normal",
  lineStatus: "",
  parkingStatus: "limited",
  weatherFeel: "",
  comment: "",
  hasPhoto: false,
  photoFile: null,
  photoPreviewUrl: null,
  locationVerified: false,
  answerQuestionId: null,
  answerQuestionBody: null,
  clientLocation: null,
};

const initialQuestion: QuestionDraft = {
  type: "crowd",
  content: "",
  isPhotoRequest: false,
};

const policyConsentKey = ["silsigan", "policy", "consent", "v1"].join("_");

export default function SilsiganPrototype() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState("ulsan-taehwagang");
  const [reportDraft, setReportDraft] = useState<ReportDraft>(initialReport);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(initialQuestion);
  const [askCredits, setAskCredits] = useState(3);
  const [trustScore, setTrustScore] = useState(86);
  const [reportsSubmitted, setReportsSubmitted] = useState(2);
  const [questionsSubmitted, setQuestionsSubmitted] = useState(1);
  const [flagged, setFlagged] = useState(false);
  const [toast, setToast] = useState("현장 인증 제보를 올리면 물어보기권을 받을 수 있어요.");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPolicyConsent, setHasPolicyConsent] = useState(() => initialPolicyConsentAccepted());
  const [pendingConsentAction, setPendingConsentAction] = useState<ConsentAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? places[0],
    [places, selectedPlaceId],
  );

  const selectedReports = useMemo(
    () => reports.filter((report) => report.placeId === selectedPlace?.id),
    [reports, selectedPlace?.id],
  );

  const selectedQuestions = useMemo(
    () => questions.filter((question) => question.placeId === selectedPlace?.id),
    [questions, selectedPlace?.id],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [placesResponse, reportsResponse, questionsResponse] = await Promise.all([
        fetchJson<ApiPlace[]>("/api/places"),
        fetchJson<PublicReport[]>("/api/reports"),
        fetchJson<PublicQuestion[]>("/api/questions"),
      ]);

      const mappedPlaces = mapPlaces(placesResponse, reportsResponse, questionsResponse);
      setPlaces(mappedPlaces);
      setReports(reportsResponse);
      setQuestions(questionsResponse);
      setSelectedPlaceId((current) => mappedPlaces.find((place) => place.id === current)?.id ?? mappedPlaces[0]?.id ?? "");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selectPlace = (place: Place, nextTab: TabId = "place") => {
    setSelectedPlaceId(place.id);
    setActiveTab(nextTab);
  };

  const requestPolicyConsent = (action: ConsentAction) => {
    if (hasPolicyConsent) {
      return false;
    }

    setPendingConsentAction(action);
    return true;
  };

  const acceptPolicyConsent = () => {
    window.localStorage.setItem(policyConsentKey, "accepted");
    setHasPolicyConsent(true);
    const action = pendingConsentAction;
    setPendingConsentAction(null);

    window.setTimeout(() => {
      if (action === "photo") {
        fileInputRef.current?.click();
      }

      if (action === "location") {
        void requestLocationAfterConsent();
      }

      if (action === "report") {
        void submitReportAfterConsent();
      }

      if (action === "question") {
        void submitQuestionAfterConsent();
      }

      if (action === "flag") {
        void reportSensitiveContentAfterConsent();
      }
    }, 0);
  };

  const requestLocation = () => {
    if (requestPolicyConsent("location")) {
      return;
    }

    void requestLocationAfterConsent();
  };

  const requestLocationAfterConsent = async () => {
    if (!navigator.geolocation) {
      setReportDraft((current) => ({
        ...current,
        locationVerified: false,
        clientLocation: null,
      }));
      setToast("현장 인증을 할 수 없어요. 위치 권한을 허용하거나 인증 없이 올려주세요.");
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 60_000,
          timeout: 8_000,
        });
      });

      setReportDraft((current) => ({
        ...current,
        locationVerified: true,
        clientLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      }));
      setToast("현장 인증됨. 정확한 위치는 저장하지 않고 장소와의 거리만 확인합니다.");
    } catch {
      setReportDraft((current) => ({
        ...current,
        locationVerified: false,
        clientLocation: null,
      }));
      setToast("현장 인증을 할 수 없어요. 다시 시도하거나 인증 없이 올릴 수 있습니다.");
    }
  };

  const submitReport = () => {
    if (requestPolicyConsent("report")) {
      return;
    }

    void submitReportAfterConsent();
  };

  const submitReportAfterConsent = async () => {
    if (!selectedPlace || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedPhotoPath = reportDraft.photoFile ? await uploadReportPhoto(reportDraft.photoFile) : null;
      const result = await fetchJson<{
        balance: number;
        credits: { amount: number }[];
      }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          placeId: selectedPlace.id,
          category: selectedPlace.category,
          crowdLevel: reportDraft.crowdLevel,
          lineStatus: reportDraft.lineStatus || "none",
          parkingStatus: reportDraft.parkingStatus,
          weatherFeel: reportDraft.weatherFeel || "good",
          comment: reportDraft.comment || undefined,
          photoPath: uploadedPhotoPath ?? undefined,
          photoMime: reportDraft.hasPhoto && !uploadedPhotoPath ? reportDraft.photoFile?.type ?? "image/jpeg" : undefined,
          photoSizeBytes: reportDraft.hasPhoto && !uploadedPhotoPath ? reportDraft.photoFile?.size ?? 128_000 : undefined,
          photoName: reportDraft.hasPhoto && !uploadedPhotoPath ? "field-report.jpg" : undefined,
          answerQuestionId: reportDraft.answerQuestionId ?? undefined,
          clientLocation: reportDraft.clientLocation ?? undefined,
        }),
      });
      const earned = result.credits.reduce((sum, event) => sum + Math.max(event.amount, 0), 0);
      setAskCredits(result.balance);
      setTrustScore((current) => Math.min(current + (reportDraft.locationVerified ? 3 : 1), 99));
      setReportsSubmitted((current) => current + 1);
      setToast(
        reportDraft.answerQuestionId
          ? `답변 완료! 물어보기권 +${earned}를 받았어요.`
          : reportDraft.locationVerified
          ? `지금 상황이 올라갔습니다. 물어보기권 +${earned}, 3시간 후 자동 만료됩니다.`
          : `인증 없이 올라갔습니다. ${earned > 0 ? `물어보기권 +${earned}, ` : ""}현장 인증 없음으로 표시됩니다.`,
      );
      setReportDraft(initialReport);
      setActiveTab("place");
      await loadData();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "지금 상황을 올리지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitQuestion = () => {
    if (requestPolicyConsent("question")) {
      return;
    }

    void submitQuestionAfterConsent();
  };

  const submitQuestionAfterConsent = async () => {
    if (!selectedPlace || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const questionType = questionDraft.isPhotoRequest ? "photo_request" : questionDraft.type;
      const result = await fetchJson<{ balance: number }>("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          placeId: selectedPlace.id,
          questionType,
          body: questionDraft.content,
        }),
      });
      const cost = questionType === "photo_request" ? 2 : 1;
      setAskCredits(result.balance);
      setQuestionsSubmitted((current) => current + 1);
      setToast(`근처 사용자에게 물어보는 중입니다. 물어보기권 ${cost}개가 차감되었습니다.`);
      setQuestionDraft(initialQuestion);
      setActiveTab("place");
      await loadData();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "물어보기를 등록하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportSensitiveContent = () => {
    if (requestPolicyConsent("flag")) {
      return;
    }

    void reportSensitiveContentAfterConsent();
  };

  const reportSensitiveContentAfterConsent = async () => {
    const reportId = selectedReports[0]?.id;
    if (!reportId) {
      setToast("신고할 제보가 아직 없습니다.");
      return;
    }

    try {
      await fetchJson("/api/moderation-flags", {
        method: "POST",
        body: JSON.stringify({
          reportId,
          reason: "sensitive_info",
          note: "사용자 신고: 얼굴/차량번호/민감정보 가능성",
        }),
      });
      setFlagged(true);
      setToast("문제 있는 제보 신고가 접수되었습니다. 운영자 큐에서 검토합니다.");
      await loadData();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    }
  };

  const openPhotoPicker = () => {
    if (requestPolicyConsent("photo")) {
      return;
    }

    fileInputRef.current?.click();
  };

  const answerQuestion = (question: PublicQuestion) => {
    const place = places.find((candidate) => candidate.id === question.placeId);

    if (!place) {
      setToast("답변할 장소를 찾지 못했습니다.");
      return;
    }

    setSelectedPlaceId(place.id);
    setReportDraft({
      ...initialReport,
      answerQuestionId: question.id,
      answerQuestionBody: question.body,
      comment: answerCommentForQuestion(question),
    });
    setToast("현장 답변하기 +2는 현장 인증 후 등록할 수 있어요.");
    setActiveTab("report");
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setToast("사진은 JPG, PNG, WebP 형식의 8MB 이하 파일만 사용할 수 있습니다.");
      return;
    }

    setReportDraft((current) => ({
      ...current,
      hasPhoto: true,
      photoFile: file,
      photoPreviewUrl: URL.createObjectURL(file),
    }));
    setToast("사진이 선택되었습니다. 사진 속 위치정보와 개인정보를 안전하게 정리합니다.");
  };

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="#실시간 모바일 프로토타입">
        <TopBar toast={toast} />
        <div className="screen-scroll">
          {loading && <EmptyState title="현장 정보를 불러오는 중입니다" body="최근 3시간 제보와 질문을 확인하고 있어요." />}
          {!loading && places.length === 0 && <EmptyState title="보여줄 장소가 없습니다" body="초기 장소 데이터를 확인해 주세요." />}
          {!loading && places.length > 0 && (
            <>
              {activeTab === "home" && (
                <HomeScreen
                  places={places}
                  questions={questions}
                  reports={reports}
                  onGoMap={() => setActiveTab("map")}
                  onGoReport={() => setActiveTab("report")}
                  onAnswerQuestion={answerQuestion}
                  onSelectPlace={selectPlace}
                />
              )}
              {activeTab === "map" && <MapScreen places={places} reports={reports} onSelectPlace={selectPlace} />}
              {activeTab === "place" && selectedPlace && (
                <PlaceScreen
                  flagged={flagged}
                  onFlag={reportSensitiveContent}
                  onAnswerQuestion={answerQuestion}
                  onGoQuestion={() => setActiveTab("question")}
                  onGoReport={() => setActiveTab("report")}
                  place={selectedPlace}
                  questions={selectedQuestions}
                  reports={selectedReports}
                />
              )}
              {activeTab === "report" && selectedPlace && (
                <ReportScreen
                  draft={reportDraft}
                  fileInputRef={fileInputRef}
                  isSubmitting={isSubmitting}
                  onChange={setReportDraft}
                  onPickPhoto={openPhotoPicker}
                  onPhotoChange={handlePhotoChange}
                  onRequestLocation={requestLocation}
                  onSubmit={submitReport}
                  place={selectedPlace}
                />
              )}
              {activeTab === "question" && selectedPlace && (
                <QuestionScreen
                  askCredits={askCredits}
                  draft={questionDraft}
                  isSubmitting={isSubmitting}
                  onChange={setQuestionDraft}
                  onSubmit={submitQuestion}
                  place={selectedPlace}
                />
              )}
              {activeTab === "my" && (
                <MyScreen
                  askCredits={askCredits}
                  questionsSubmitted={questionsSubmitted}
                  reportsSubmitted={reportsSubmitted}
                  trustScore={trustScore}
                />
              )}
            </>
          )}
        </div>
        {pendingConsentAction && (
          <PolicyConsentModal
            action={pendingConsentAction}
            onAccept={acceptPolicyConsent}
            onClose={() => setPendingConsentAction(null)}
          />
        )}
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </section>
    </main>
  );
}

function TopBar({ toast }: { toast: string }) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">울산, 부산, 경주 베타</p>
        <h1>#실시간</h1>
      </div>
      <div className="trust-chip" aria-label="실시간 인증 정책">
        <ShieldCheck size={18} />
        <span>현장 인증</span>
      </div>
      <p className="toast" role="status">
        {toast}
      </p>
    </header>
  );
}

function HomeScreen({
  places,
  questions,
  reports,
  onGoMap,
  onGoReport,
  onAnswerQuestion,
  onSelectPlace,
}: {
  places: Place[];
  questions: PublicQuestion[];
  reports: PublicReport[];
  onGoMap: () => void;
  onGoReport: () => void;
  onAnswerQuestion: (question: PublicQuestion) => void;
  onSelectPlace: (place: Place) => void;
}) {
  const calmPlaces = places.filter((place) => place.crowdLevel === "quiet" || place.crowdLevel === "normal");
  const busyPlaces = places.filter((place) => place.crowdLevel === "busy" || place.crowdLevel === "packed");
  const recentReports = reports.slice(0, 3);
  const featuredReport = recentReports[0];
  const featuredPlace = featuredReport ? places.find((candidate) => candidate.id === featuredReport.placeId) : null;

  return (
    <div className="screen-stack">
      <label className="search-box">
        <Search size={20} />
        <input placeholder="지금 어디가 궁금하세요?" type="search" />
      </label>

      <section className="section-block">
        <div className="section-title">
          <h2>방금 올라온 현장</h2>
          <span>최근 3시간</span>
        </div>
        {featuredReport && featuredPlace && (
          <button className="featured-live-card" onClick={() => onSelectPlace(featuredPlace)} type="button">
            <div className="featured-live-photo">
              <Camera size={28} />
              <span>{verificationLabel(featuredReport)}</span>
            </div>
            <div>
              <strong>{featuredPlace.name}</strong>
              <p>{featuredReport.comment ?? "현장 상태가 업데이트됐습니다."}</p>
              <span>
                {minutesAgo(featuredReport.createdAt)} · {featuredReport.photoUrl ? "사진 있음" : "사진 없음"}
              </span>
            </div>
          </button>
        )}
        <div className="live-feed">
          {recentReports.slice(featuredReport ? 1 : 0).map((report) => {
            const place = places.find((candidate) => candidate.id === report.placeId);
            return (
              <button className="live-card" key={report.id} onClick={() => place && onSelectPlace(place)} type="button">
                <div className="live-thumb">
                  <Camera size={20} />
                </div>
                <div>
                  <strong>{place?.name ?? "현장"}</strong>
                  <p>{report.comment ?? "현장 상태가 업데이트됐습니다."}</p>
                  <span>{minutesAgo(report.createdAt)} · {verificationLabel(report)} · {report.photoUrl ? "사진 있음" : "사진 없음"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <AnswerableQuestions questions={questions} places={places} onAnswerQuestion={onAnswerQuestion} />
      <section className="home-map-teaser">
        <div>
          <p className="eyebrow">내주변 지도</p>
          <h2>지도는 필터로 빠르게 확인하세요</h2>
          <p>주차, 줄, 혼잡, 한산, 사진 있는 제보만 골라 볼 수 있습니다.</p>
        </div>
        <div className="teaser-actions">
          <button onClick={onGoMap} type="button">
            <LocateFixed size={18} />
            지도 보기
          </button>
          <button onClick={onGoReport} type="button">
            <Camera size={18} />
            올리기
          </button>
        </div>
      </section>
      <QuickStats />
      <PlaceCarousel title="지금 물어본 곳" places={places} onSelectPlace={onSelectPlace} />
      <PlaceCarousel title="지금 혼잡한 곳" places={busyPlaces} onSelectPlace={onSelectPlace} />
      <PlaceCarousel title="지금 한산한 곳" places={calmPlaces} onSelectPlace={onSelectPlace} />
    </div>
  );
}

function QuickStats() {
  return (
    <section className="quick-grid" aria-label="서비스 핵심 상태">
      <div>
        <Clock3 size={18} />
        <strong>3시간</strong>
        <span>제보 자동 만료</span>
      </div>
      <div>
        <Ticket size={18} />
        <strong>3개</strong>
        <span>가입 물어보기권</span>
      </div>
      <div>
        <BadgeCheck size={18} />
        <strong>비공개</strong>
        <span>개인 위치</span>
      </div>
    </section>
  );
}

function AnswerableQuestions({
  questions,
  places,
  onAnswerQuestion,
}: {
  questions: PublicQuestion[];
  places: Place[];
  onAnswerQuestion: (question: PublicQuestion) => void;
}) {
  const openQuestions = questions.filter((question) => !question.answeredReportId).slice(0, 3);

  if (openQuestions.length === 0) {
    return null;
  }

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>내 주변 답변 가능한 질문</h2>
        <span>답하면 +2</span>
      </div>
      <div className="answer-list">
        {openQuestions.map((question) => {
          const place = places.find((candidate) => candidate.id === question.placeId);

          return (
            <button
              className="answer-card"
              disabled={!place}
              key={question.id}
              onClick={() => onAnswerQuestion(question)}
              type="button"
            >
              <MessageCircleQuestion size={20} />
              <div>
                <strong>{question.body}</strong>
                <span>
                  {place?.name ?? "장소 확인 중"} · {questionTypeLabels[question.questionType]} · {minutesAgo(question.createdAt)}
                </span>
                <em>현장 답변하기 +2</em>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlaceCarousel({
  title,
  places,
  onSelectPlace,
}: {
  title: string;
  places: Place[];
  onSelectPlace: (place: Place) => void;
}) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{places.length}곳</span>
      </div>
      <div className="place-list">
        {places.map((place) => (
          <button className="place-card" key={place.id} onClick={() => onSelectPlace(place)} type="button">
            <div>
              <StatusPill level={place.crowdLevel} />
              <h3>{place.name}</h3>
              <p>{place.summary}</p>
            </div>
            <div className="card-meta">
              <span>{place.goSignal}</span>
              <span>{place.updatedAt}</span>
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MapScreen({
  places,
  reports,
  onSelectPlace,
}: {
  places: Place[];
  reports: PublicReport[];
  onSelectPlace: (place: Place) => void;
}) {
  const [mapFilter, setMapFilter] = useState("all");
  const filteredPlaces = places.filter((place) => {
    const latest = reports.find((report) => report.placeId === place.id);

    if (mapFilter === "parking") {
      return latest?.parkingStatus === "full";
    }

    if (mapFilter === "line") {
      return latest?.lineStatus === "long";
    }

    if (mapFilter === "busy") {
      return latest?.crowdLevel === "busy" || latest?.crowdLevel === "packed";
    }

    if (mapFilter === "quiet") {
      return latest?.crowdLevel === "quiet" || latest?.crowdLevel === "normal";
    }

    if (mapFilter === "photo") {
      return Boolean(latest?.photoUrl);
    }

    return true;
  });

  return (
    <div className="screen-stack">
      <section className="full-map" aria-label="주변 제보 지도">
        <NaverMap places={filteredPlaces} onSelectPlace={onSelectPlace} />
      </section>
      <section className="map-filter-row" aria-label="지도 필터">
        {[
          ["all", "전체"],
          ["parking", "주차 만차"],
          ["line", "줄 있음"],
          ["busy", "사람 많음"],
          ["quiet", "한산함"],
          ["photo", "사진 있음"],
        ].map(([id, label]) => (
          <button aria-pressed={mapFilter === id} key={id} onClick={() => setMapFilter(id)} type="button">
            {label}
          </button>
        ))}
      </section>
      <PlaceCarousel title="내 주변 장소" places={filteredPlaces} onSelectPlace={onSelectPlace} />
    </div>
  );
}

function PlaceScreen({
  flagged,
  onFlag,
  onAnswerQuestion,
  onGoQuestion,
  onGoReport,
  place,
  questions,
  reports,
}: {
  flagged: boolean;
  onFlag: () => void;
  onAnswerQuestion: (question: PublicQuestion) => void;
  onGoQuestion: () => void;
  onGoReport: () => void;
  place: Place;
  questions: PublicQuestion[];
  reports: PublicReport[];
}) {
  const isSensitive = place.category === "hospital" || place.category === "public_office";
  const verifiedReports = reports.filter((report) => report.locationVerified);
  const unverifiedReports = reports.filter((report) => !report.locationVerified);
  const photoReports = reports.filter((report) => report.photoUrl);
  const lastVerifiedReport = verifiedReports[0];

  return (
    <div className="screen-stack">
      <section className="detail-hero">
        <div className={`go-signal go-signal--${signalClass(place.goSignal)}`}>{place.goSignal}</div>
        <StatusPill level={place.crowdLevel} label={place.status} />
        <h2>{place.name}</h2>
        <p>{place.address}</p>
        <div className="detail-summary">{place.summary}</div>
        <div className="metric-row">
          <span>사람 {place.status}</span>
          <span>줄 {place.line}</span>
          <span>주차 {place.parking}</span>
          <span>날씨 {place.weather}</span>
        </div>
      </section>

      <section className="trust-metrics-card" aria-label="장소 신뢰 정보">
        <div>
          <span>마지막 현장 인증</span>
          <strong>{lastVerifiedReport ? minutesAgo(lastVerifiedReport.createdAt) : "없음"}</strong>
        </div>
        <div>
          <span>최근 3시간 제보</span>
          <strong>{reports.length}건</strong>
        </div>
        <div>
          <span>인증 없는 제보</span>
          <strong>{unverifiedReports.length}건</strong>
        </div>
        <div>
          <span>사진 있는 제보</span>
          <strong>{photoReports.length}건</strong>
        </div>
      </section>

      {isSensitive && <SensitiveWarning />}

      <section className="photo-strip" aria-label="최근 현장 사진">
        <div className="section-title">
          <h2>최근 현장 사진</h2>
          <span>{reports.length}건</span>
        </div>
        <div className="photo-grid">
          {(reports.length ? reports : []).slice(0, 3).map((report, index) => (
            <div className="photo-tile" key={report.id}>
              <Camera size={22} />
              <span>{report.comment ?? place.photos[index] ?? "현장 제보"}</span>
              <small>{minutesAgo(report.createdAt)} · {verificationLabel(report)} · {report.photoUrl ? "사진 있음" : "사진 없음"}</small>
            </div>
          ))}
        </div>
        <div className="report-trust-grid">
          <ReportTrustGroup title="현장 인증 제보" reports={verifiedReports} />
          <ReportTrustGroup title="인증 없는 제보" reports={unverifiedReports} />
        </div>
      </section>

      <section className="question-preview">
        <div className="section-title">
          <h2>물어보기 목록</h2>
          <span>{questions.length}개</span>
        </div>
        {questions.length === 0 ? (
          <article>
            <MessageCircleQuestion size={20} />
            <div>
              <strong>아직 물어보기가 없습니다</strong>
              <p>지금 궁금한 내용을 남기면 근처 사람이 답할 수 있어요.</p>
            </div>
          </article>
        ) : (
          questions.slice(0, 2).map((question) => (
            <article key={question.id}>
              <MessageCircleQuestion size={20} />
              <div>
                <strong>{question.body}</strong>
                <p>
                  {questionTypeLabels[question.questionType]} · {minutesAgo(question.createdAt)} ·{" "}
                  {question.answeredReportId ? "답변 완료" : "답변 대기"}
                </p>
                {!question.answeredReportId && (
                  <button className="inline-answer-button" onClick={() => onAnswerQuestion(question)} type="button">
                    현장 답변하기 +2
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <div className="sticky-actions">
        <ActionButton onClick={onGoReport}>지금 상황 알려주기</ActionButton>
        <ActionButton onClick={onGoQuestion} variant="secondary">
          여기 지금 어때요?
        </ActionButton>
      </div>
      <ActionButton onClick={onFlag} variant="danger" disabled={flagged}>
        <Flag size={18} />
        {flagged ? "신고 접수됨" : "문제 있는 제보 신고"}
      </ActionButton>
    </div>
  );
}

function SensitiveWarning() {
  return (
    <section className="sensitive-warning" role="alert">
      <ShieldAlert size={22} />
      <div>
        <strong>사진 업로드 전 확인</strong>
        <p>사람 얼굴, 이름, 접수번호, 차량번호, 진료정보, 서류가 보이지 않게 찍어 주세요. 병원과 관공서는 외부나 주차장 사진만 권장합니다.</p>
      </div>
    </section>
  );
}

function SensitiveWorkflowCard() {
  return (
    <section className="sensitive-workflow-card">
      <strong>병원/관공서는 대기와 주차 중심</strong>
      <p>대기 적음/보통/많음, 주차 가능/부족/만차, 접수 줄 없음/짧음/김 위주로 알려주세요.</p>
      <span>사진은 외부/주차장 사진만 추가할 수 있습니다.</span>
    </section>
  );
}

function RewardPolicyCard({ answeringQuestion }: { answeringQuestion: boolean }) {
  return (
    <section className="reward-policy-card" aria-label="제보 보상 정책">
      <div>
        <strong>현장 인증 + 사진</strong>
        <span>물어보기권 +2</span>
      </div>
      <div>
        <strong>현장 인증만</strong>
        <span>물어보기권 +1</span>
      </div>
      <div>
        <strong>인증 없음</strong>
        <span>보상 없음, 낮은 신뢰도</span>
      </div>
      {answeringQuestion && <p>질문에 답하면 현장 인증 제보 보상에 답변 보상 +2가 추가됩니다.</p>}
    </section>
  );
}

function ReportTrustGroup({ title, reports }: { title: string; reports: PublicReport[] }) {
  return (
    <div className="report-trust-group">
      <strong>{title}</strong>
      {reports.length === 0 ? (
        <span>아직 없습니다</span>
      ) : (
        reports.slice(0, 2).map((report) => (
          <p key={report.id}>
            {report.comment ?? "현장 상태 제보"} · {minutesAgo(report.createdAt)}
          </p>
        ))
      )}
    </div>
  );
}

function PhotoUploadButton({
  draft,
  isSensitive,
  onPickPhoto,
}: {
  draft: ReportDraft;
  isSensitive: boolean;
  onPickPhoto: () => void;
}) {
  return (
    <button className={`upload-box ${isSensitive ? "upload-box--caution" : ""}`} onClick={onPickPhoto} type="button">
      {draft.photoPreviewUrl ? <span className="photo-preview-dot" /> : <Upload size={24} />}
      <strong>{draft.hasPhoto ? "사진 선택됨" : isSensitive ? "외부/주차장 사진만 선택" : "사진 추가"}</strong>
      <span>
        {isSensitive
          ? "사진은 선택이에요. 얼굴, 접수번호, 서류, 진료정보가 보이는 내부 사진은 올릴 수 없습니다."
          : "JPG, PNG, WebP 사진을 올릴 수 있어요. 사진 속 위치정보와 개인정보는 보이지 않게 정리합니다."}
      </span>
    </button>
  );
}

function ReportScreen({
  draft,
  fileInputRef,
  isSubmitting,
  onChange,
  onPickPhoto,
  onPhotoChange,
  onRequestLocation,
  onSubmit,
  place,
}: {
  draft: ReportDraft;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onChange: (draft: ReportDraft) => void;
  onPickPhoto: () => void;
  onPhotoChange: (file: File | null) => void;
  onRequestLocation: () => void;
  onSubmit: () => void;
  place: Place;
}) {
  const isSensitive = place.category === "hospital" || place.category === "public_office";

  return (
    <form className="screen-stack" onSubmit={(event) => event.preventDefault()}>
      <section className="form-hero">
        <p className="eyebrow">10초 현장 공유</p>
        <h2>{place.name}</h2>
        <p>
          {draft.answerQuestionBody
            ? "질문에 답하려면 현장 인증이 필요합니다. 사람, 주차, 한 줄만 빠르게 남겨 주세요."
            : "사진, 사람, 주차, 한 줄만 빠르게 남깁니다. 줄과 날씨는 선택입니다."}
        </p>
      </section>
      {draft.answerQuestionBody && (
        <section className="answer-target-card">
          <MessageCircleQuestion size={20} />
          <div>
            <strong>현장 답변하기 +2</strong>
            <p>{draft.answerQuestionBody}</p>
          </div>
        </section>
      )}
      <RewardPolicyCard answeringQuestion={Boolean(draft.answerQuestionId)} />
      {isSensitive && <SensitiveWarning />}
      {isSensitive && <SensitiveWorkflowCard />}
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => onPhotoChange(event.target.files?.[0] ?? null)}
        ref={fileInputRef}
        type="file"
      />
      {!isSensitive && <PhotoUploadButton draft={draft} isSensitive={isSensitive} onPickPhoto={onPickPhoto} />}
      <SegmentedControl
        label="사람"
        onChange={(crowdLevel) => onChange({ ...draft, crowdLevel: crowdLevel as CrowdLevel })}
        options={crowdOptions}
        value={draft.crowdLevel}
      />
      <SegmentedControl
        label="주차"
        onChange={(parkingStatus) => onChange({ ...draft, parkingStatus: parkingStatus as ParkingStatus })}
        options={parkingOptions}
        value={draft.parkingStatus}
      />
      {isSensitive && <PhotoUploadButton draft={draft} isSensitive={isSensitive} onPickPhoto={onPickPhoto} />}
      <details className="optional-fields">
        <summary>줄/날씨 선택 입력</summary>
        <SegmentedControl
          label="줄"
          onChange={(lineStatus) => onChange({ ...draft, lineStatus: lineStatus as LineStatus })}
          options={lineOptions}
          value={draft.lineStatus}
        />
        <SegmentedControl
          label="날씨"
          onChange={(weatherFeel) => onChange({ ...draft, weatherFeel: weatherFeel as WeatherFeel })}
          options={weatherOptions}
          value={draft.weatherFeel}
        />
      </details>
      <label className="text-field">
        한 줄 코멘트
        <textarea
          maxLength={80}
          onChange={(event) => onChange({ ...draft, comment: event.target.value })}
          placeholder="예: 입구 줄 짧고 주차장은 거의 찼어요."
          value={draft.comment}
        />
      </label>
      <button className="verify-card verify-card--button" onClick={onRequestLocation} type="button">
        <CheckCircle2 size={22} />
        <div>
          <strong>{draft.locationVerified ? "현장 인증됨" : "현장 인증하기"}</strong>
          <p>
            {draft.locationVerified
              ? "정확한 위치는 저장하지 않고 장소와의 거리만 확인합니다."
              : "위치 권한을 허용하면 현장 인증으로 표시됩니다."}
          </p>
        </div>
      </button>
      {draft.locationVerified ? (
        <ActionButton disabled={isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "올리는 중..." : "현장 인증으로 올리기"}
        </ActionButton>
      ) : draft.answerQuestionId ? (
        <div className="location-actions location-actions--single">
          <p className="unverified-policy">질문 답변 +2는 현장 인증이 필요합니다. 인증 없이 올리면 답변 보상을 받을 수 없습니다.</p>
          <ActionButton disabled={isSubmitting} onClick={onRequestLocation} type="button" variant="secondary">
            현장 인증 다시 시도
          </ActionButton>
        </div>
      ) : (
        <div className="location-actions">
          <p className="unverified-policy">인증 없이 올리면 낮은 신뢰도로 표시되고 물어보기권 보상은 없습니다.</p>
          <ActionButton disabled={isSubmitting} onClick={onRequestLocation} type="button" variant="secondary">
            현장 인증 다시 시도
          </ActionButton>
          <ActionButton disabled={isSubmitting} onClick={onSubmit} type="button" variant="secondary">
            인증 없이 제보하기
          </ActionButton>
        </div>
      )}
    </form>
  );
}

function QuestionScreen({
  askCredits,
  draft,
  isSubmitting,
  onChange,
  onSubmit,
  place,
}: {
  askCredits: number;
  draft: QuestionDraft;
  isSubmitting: boolean;
  onChange: (draft: QuestionDraft) => void;
  onSubmit: () => void;
  place: Place;
}) {
  const questionType = draft.isPhotoRequest ? "photo_request" : draft.type;
  const cost = questionType === "photo_request" ? 2 : 1;

  return (
    <form className="screen-stack" onSubmit={(event) => event.preventDefault()}>
      <section className="form-hero">
        <p className="eyebrow">여기 지금 어때요?</p>
        <h2>{place.name}</h2>
        <p>근처 사람이 바로 답하기 쉬운 질문을 남겨 보세요.</p>
      </section>
      <div className="ticket-card">
        <Ticket size={24} />
        <div>
          <strong>내 물어보기권 {askCredits}개</strong>
          <p>이번 물어보기는 {cost}개 차감됩니다.</p>
        </div>
      </div>
      <div className="example-chips" aria-label="예시 질문">
        {["지금 주차 가능해요?", "줄 얼마나 길어요?", "사람 너무 많나요?", "사진 한 장 가능할까요?", "대기 얼마나 걸려요?"].map((example) => (
          <button key={example} onClick={() => onChange({ ...draft, content: example })} type="button">
            {example}
          </button>
        ))}
      </div>
      <SegmentedControl
        label="질문 유형"
        onChange={(type) => onChange({ ...draft, type: type as QuestionType, isPhotoRequest: type === "photo_request" })}
        options={questionTypes}
        value={draft.type}
      />
      <label className="toggle-line">
        <input
          checked={draft.isPhotoRequest}
          onChange={(event) => onChange({ ...draft, isPhotoRequest: event.target.checked })}
          type="checkbox"
        />
        사진 요청 포함
      </label>
      <label className="text-field">
        물어보기 내용
        <textarea
          maxLength={120}
          onChange={(event) => onChange({ ...draft, content: event.target.value })}
          placeholder="예: 지금 공영주차장에 빈 자리 있나요?"
          value={draft.content}
        />
      </label>
      <ActionButton disabled={askCredits < cost || draft.content.trim().length < 4 || isSubmitting} onClick={onSubmit} type="button">
        {isSubmitting ? "등록 중..." : "물어보기 등록"}
      </ActionButton>
    </form>
  );
}

function MyScreen({
  askCredits,
  questionsSubmitted,
  reportsSubmitted,
  trustScore,
}: {
  askCredits: number;
  questionsSubmitted: number;
  reportsSubmitted: number;
  trustScore: number;
}) {
  return (
    <div className="screen-stack">
      <section className="profile-card">
        <div className="avatar">
          <Sparkles size={28} />
        </div>
        <div>
          <p className="eyebrow">신뢰 제보자</p>
          <h2>{trustScore}점</h2>
          <p>현장 인증과 신고 이력이 신뢰 배지에 반영됩니다.</p>
        </div>
      </section>
      <section className="my-grid">
        <div>
          <Ticket size={22} />
          <strong>{askCredits}</strong>
          <span>물어보기권</span>
        </div>
        <div>
          <Camera size={22} />
          <strong>{reportsSubmitted}</strong>
          <span>내 제보</span>
        </div>
        <div>
          <MessageCircleQuestion size={22} />
          <strong>{questionsSubmitted}</strong>
          <span>내 물어보기</span>
        </div>
        <div>
          <BadgeCheck size={22} />
          <strong>0</strong>
          <span>내가 답한 질문</span>
        </div>
        <div>
          <ShieldAlert size={22} />
          <strong>0</strong>
          <span>신고/삭제된 제보</span>
        </div>
        <div>
          <ShieldCheck size={22} />
          <strong>{trustScore}</strong>
          <span>신뢰도</span>
        </div>
      </section>
      <section className="policy-list">
        <h2>안전 정책</h2>
        <p>정확한 내 위치는 공개하지 않고 현장 인증 여부만 보여줍니다.</p>
        <p>사진 속 위치정보와 원본 파일명은 보이지 않게 정리합니다.</p>
        <p>허위 확정 신고는 신뢰 점수와 물어보기권 차감에 반영됩니다.</p>
        <a href="/terms">약관</a>
        <a href="/privacy">개인정보 처리방침</a>
        <a href="/location-terms">위치기반서비스 이용약관</a>
        <a href="/photo-policy">사진 업로드 정책</a>
        <a href="/account/delete">계정 삭제</a>
      </section>
    </div>
  );
}

function PolicyConsentModal({
  action,
  onAccept,
  onClose,
}: {
  action: ConsentAction;
  onAccept: () => void;
  onClose: () => void;
}) {
  const actionLabel: Record<ConsentAction, string> = {
    photo: "사진 업로드",
    location: "위치 현장 인증",
    report: "제보 등록",
    question: "물어보기 등록",
    flag: "신고 접수",
  };

  return (
    <div className="policy-modal-backdrop" role="presentation">
      <section className="policy-modal" role="dialog" aria-modal="true" aria-label="서비스 약관 동의">
        <p className="eyebrow">처음 한 번만 확인</p>
        <h2>{actionLabel[action]} 전에 동의가 필요합니다</h2>
        <div className="policy-check-list">
          <label>
            <input type="checkbox" checked readOnly />
            이용약관 동의
          </label>
          <label>
            <input type="checkbox" checked readOnly />
            개인정보 처리방침 동의
          </label>
          <label>
            <input type="checkbox" checked readOnly />
            위치기반서비스 이용약관 동의
          </label>
          <label>
            <input type="checkbox" checked readOnly />
            사진 업로드 정책 동의
          </label>
        </div>
        <p>
          얼굴, 차량번호, 서류, 진료정보가 보이는 사진은 올릴 수 없고, 정확한 위치는 현장 인증에만 사용됩니다.
        </p>
        <div className="policy-link-row">
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보 처리방침</a>
          <a href="/location-terms">위치기반서비스 이용약관</a>
          <a href="/photo-policy">사진 업로드 정책</a>
        </div>
        <div className="policy-modal-actions">
          <button onClick={onClose} type="button">
            닫기
          </button>
          <button onClick={onAccept} type="button">
            동의하고 계속
          </button>
        </div>
      </section>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="주요 화면">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isCurrent = activeTab === item.id || (activeTab === "place" && item.id === "home");
        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            className="nav-button"
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  );
}

async function uploadReportPhoto(file: File) {
  const accessToken = await getSupabaseAccessToken();

  if (!accessToken) {
    return null;
  }

  const formData = new FormData();
  formData.append("photo", file);

  const result = await fetchJson<{ photoPath: string }>("/api/report-photos", {
    method: "POST",
    body: formData,
  });

  return result.photoPath;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = init?.body instanceof FormData;
  const accessToken = await getSupabaseAccessToken();

  if (!isFormData && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "요청 처리 중 오류가 발생했습니다.");
  }

  return payload.data as T;
}

function mapPlaces(apiPlaces: ApiPlace[], reports: PublicReport[], questions: PublicQuestion[]): Place[] {
  return apiPlaces.map((place, index) => {
    const latestReports = reports.filter((report) => report.placeId === place.id);
    const latest = latestReports[0];
    const presentation = presentationByPlaceId[place.id] ?? {
      distance: `${index + 1}.0km`,
      coordinates: { x: 30 + index * 12, y: 40 + index * 8 },
      goSignal: "제보 기준 애매" as const,
    };
    const crowdLevel = latest?.crowdLevel ?? "normal";
    const lineStatus = latest?.lineStatus ?? "none";
    const parkingStatus = latest?.parkingStatus ?? "unknown";
    const weatherFeel = latest?.weatherFeel ?? "good";

    return {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      distance: presentation.distance,
      status: crowdLabels[crowdLevel],
      summary: latest?.comment ?? `${categoryLabels[place.category]} 현장 정보가 업데이트를 기다리고 있어요.`,
      crowdLevel,
      line: lineLabels[lineStatus],
      parking: parkingLabels[parkingStatus],
      weather: weatherLabels[weatherFeel],
      updatedAt: latest ? minutesAgo(latest.createdAt) : "정보 없음",
      reports: latestReports.length,
      questions: questions.filter((question) => question.placeId === place.id && !question.answeredReportId).length,
      coordinates: presentation.coordinates,
      photos: latestReports.map((report) => report.comment ?? "현장 제보"),
      safetyWarning: "safetyWarning" in place && typeof place.safetyWarning === "string" ? place.safetyWarning : null,
      goSignal:
        latest?.crowdLevel === "packed" || latest?.parkingStatus === "full" ? "제보 기준 혼잡" : presentation.goSignal,
    };
  });
}

function answerCommentForQuestion(question: PublicQuestion) {
  if (question.questionType === "parking") {
    return "지금 주차 상태는 현장에서 확인했어요.";
  }

  if (question.questionType === "line") {
    return "지금 줄 상태는 현장에서 확인했어요.";
  }

  if (question.questionType === "photo_request") {
    return "요청하신 현장 사진 기준으로 답변합니다.";
  }

  return "지금 현장 상태를 확인했어요.";
}

function initialPolicyConsentAccepted() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(policyConsentKey) === "accepted";
}

function minutesAgo(createdAt: string) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000));

  if (diffMinutes >= 60) {
    return `${Math.round(diffMinutes / 60)}시간 전`;
  }

  return `${diffMinutes}분 전`;
}

function signalClass(signal: Place["goSignal"]) {
  if (signal === "제보 기준 괜찮음") {
    return "good";
  }

  if (signal === "제보 기준 혼잡") {
    return "bad";
  }

  return "caution";
}

function verificationLabel(report: Pick<PublicReport, "verifiedRadiusM">) {
  return report.verifiedRadiusM ? "현장 인증" : "현장 인증 없음";
}
