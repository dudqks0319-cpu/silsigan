"use client";

import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleParking,
  Clock,
  CloudSun,
  Filter,
  Flag,
  Home,
  Hospital,
  Image as ImageIcon,
  LocateFixed,
  Map,
  MapPin,
  MessageCircleQuestion,
  Navigation,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  User,
  UserX,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SilsiganRedesign.module.css";

type View = "home" | "map" | "place" | "report" | "ask" | "my" | "admin";
type StatusTone = "calm" | "normal" | "busy" | "danger";
type Category = "beach" | "food" | "public" | "hospital" | "parking" | "festival";

type Place = {
  id: string;
  name: string;
  category: Category;
  address: string;
  distance: string;
  signal: string;
  summary: string;
  crowd: string;
  parking: string;
  line: string;
  weather: string;
  updated: string;
  score: number;
  x: number;
  y: number;
  tone: StatusTone;
  visitors: string;
};

type Report = {
  id: string;
  placeId: string;
  title: string;
  body: string;
  meta: string;
  tone: StatusTone;
  verified: boolean;
  hasPhoto: boolean;
};

type Question = {
  id: string;
  placeId: string;
  body: string;
  reward: string;
  time: string;
};

type ModerationItem = {
  id: string;
  type: string;
  place: string;
  reason: string;
  age: string;
  risk: "높음" | "보통" | "낮음";
};

const places: Place[] = [
  {
    id: "haeundae",
    name: "해운대 해수욕장",
    category: "beach",
    address: "부산 해운대구 해운대해변로",
    distance: "120m",
    signal: "지금은 붐빔",
    summary: "사람 많음 · 사진 제보 8건 · 주차 거의 없음",
    crowd: "매우 많음",
    parking: "거의 없음",
    line: "보통",
    weather: "맑음 26℃",
    updated: "2분 전",
    score: 86,
    x: 65,
    y: 39,
    tone: "busy",
    visitors: "1.2만",
  },
  {
    id: "hwangridan",
    name: "경주 황리단길",
    category: "food",
    address: "경북 경주시 포석로 일대",
    distance: "29km",
    signal: "웨이팅 주의",
    summary: "맛집 줄 있음 · 골목 혼잡 · 사진 4건",
    crowd: "많음",
    parking: "만차",
    line: "있음",
    weather: "구름 24℃",
    updated: "10분 전",
    score: 79,
    x: 52,
    y: 62,
    tone: "danger",
    visitors: "8.7천",
  },
  {
    id: "taehwa",
    name: "태화강 국가정원",
    category: "festival",
    address: "울산 중구 태화강국가정원길",
    distance: "1.2km",
    signal: "가도 좋음",
    summary: "한산 · 주차 여유 · 산책하기 좋음",
    crowd: "한산",
    parking: "여유 있음",
    line: "없음",
    weather: "맑음 25℃",
    updated: "18분 전",
    score: 94,
    x: 31,
    y: 47,
    tone: "calm",
    visitors: "6.1천",
  },
  {
    id: "cityhall",
    name: "울산시청 민원실",
    category: "public",
    address: "울산 남구 중앙로 201",
    distance: "2.1km",
    signal: "대기 보통",
    summary: "민원 대기 20분 안팎 · 사진 제한 장소",
    crowd: "보통",
    parking: "널널",
    line: "보통",
    weather: "실내",
    updated: "24분 전",
    score: 88,
    x: 37,
    y: 74,
    tone: "normal",
    visitors: "2.4천",
  },
];

const reports: Report[] = [
  {
    id: "r1",
    placeId: "haeundae",
    title: "해변 중앙 입구",
    body: "돗자리 자리 거의 찼고, 사진 찍는 줄이 꽤 길어요.",
    meta: "2분 전 · 현장 인증 · 사진 있음",
    tone: "busy",
    verified: true,
    hasPhoto: true,
  },
  {
    id: "r2",
    placeId: "hwangridan",
    title: "황남동 골목",
    body: "메인 골목은 천천히 이동해야 하고 카페 앞 웨이팅 있습니다.",
    meta: "10분 전 · 거리 150m · 사진 있음",
    tone: "danger",
    verified: true,
    hasPhoto: true,
  },
  {
    id: "r3",
    placeId: "taehwa",
    title: "국가정원 남문",
    body: "산책로 한산하고 주차장도 여유 있어요.",
    meta: "18분 전 · 현장 인증",
    tone: "calm",
    verified: true,
    hasPhoto: false,
  },
  {
    id: "r4",
    placeId: "cityhall",
    title: "민원실 대기",
    body: "번호표 기준 대기 12명 정도입니다. 내부 사진은 올리지 않았어요.",
    meta: "24분 전 · 사진 없음 · 민감장소",
    tone: "normal",
    verified: false,
    hasPhoto: false,
  },
];

const questions: Question[] = [
  { id: "q1", placeId: "haeundae", body: "지금 주차 자리 있나요?", reward: "+2", time: "3분 전" },
  { id: "q2", placeId: "hwangridan", body: "황리단길 카페 웨이팅 긴가요?", reward: "+2", time: "12분 전" },
  { id: "q3", placeId: "taehwa", body: "돗자리 펴기 괜찮나요?", reward: "+1", time: "19분 전" },
];

const moderationItems: ModerationItem[] = [
  { id: "m1", type: "사진 검토", place: "해운대 해수욕장", reason: "얼굴/차량번호 노출 가능성", age: "8분 전", risk: "높음" },
  { id: "m2", type: "욕설 신고", place: "경주 황리단길", reason: "댓글 내 비방 표현", age: "31분 전", risk: "보통" },
  { id: "m3", type: "허위 정보", place: "울산시청 민원실", reason: "운영시간 관련 부정확한 제보", age: "1시간 전", risk: "낮음" },
];

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "home", label: "홈", icon: Home },
  { id: "map", label: "지도", icon: Map },
  { id: "report", label: "제보", icon: Plus },
  { id: "ask", label: "질문", icon: MessageCircleQuestion },
  { id: "my", label: "마이", icon: User },
];

const filterLabels = ["전체", "사람 많음", "주차 만차", "줄 있음", "사진 있음"];
const reportChips = ["사람 없음", "보통", "많음", "매우 많음"];
const parkingChips = ["널널", "여유 있음", "거의 없음", "만차"];
const lineChips = ["없음", "보통", "있음", "매우 김"];
const weatherChips = ["맑음", "흐림", "비", "실내"];
const questionExamples = ["주차 자리 있나요?", "줄 많이 긴가요?", "사진으로 볼 수 있나요?", "아이랑 가도 괜찮나요?"];

export default function SilsiganRedesign() {
  const [activeView, setActiveView] = useState<View>("home");
  const phoneBodyRef = useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(places[0].id);
  const [activeFilter, setActiveFilter] = useState(filterLabels[0]);
  const [reportText, setReportText] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [toast, setToast] = useState("현장 인증 제보를 올리면 물어보기권을 받을 수 있어요.");
  const [pickedCrowd, setPickedCrowd] = useState("많음");
  const [pickedParking, setPickedParking] = useState("거의 없음");
  const [pickedLine, setPickedLine] = useState("있음");
  const [pickedWeather, setPickedWeather] = useState("맑음");

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? places[0],
    [selectedPlaceId],
  );

  const selectedReports = useMemo(
    () => reports.filter((report) => report.placeId === selectedPlace.id),
    [selectedPlace.id],
  );

  useEffect(() => {
    if (phoneBodyRef.current) {
      phoneBodyRef.current.scrollTop = 0;
    }
  }, [activeView]);

  const openPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    setActiveView("place");
  };

  const submitMock = (message: string) => {
    setToast(message);
    setActiveView("place");
  };

  return (
    <main className={styles.redesign}>
      <section className={styles.appCanvas} aria-label="#실시간 앱 프론트엔드 디자인">
        <div className={styles.phoneFrame}>
          <StatusBar />
          <TopHeader
            activeView={activeView}
            selectedPlace={selectedPlace}
            toast={toast}
            onBack={() => setActiveView("home")}
            onAdmin={() => setActiveView("admin")}
          />

          <div className={styles.phoneBody} ref={phoneBodyRef}>
            {activeView === "home" && <HomeScreen onOpenPlace={openPlace} onGoMap={() => setActiveView("map")} onGoReport={() => setActiveView("report")} />}
            {activeView === "map" && (
              <MapScreen
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onOpenPlace={openPlace}
                selectedPlace={selectedPlace}
              />
            )}
            {activeView === "place" && (
              <PlaceScreen
                place={selectedPlace}
                reports={selectedReports}
                onAsk={() => setActiveView("ask")}
                onReport={() => setActiveView("report")}
                onToast={setToast}
              />
            )}
            {activeView === "report" && (
              <ReportScreen
                place={selectedPlace}
                pickedCrowd={pickedCrowd}
                pickedParking={pickedParking}
                pickedLine={pickedLine}
                pickedWeather={pickedWeather}
                reportText={reportText}
                setPickedCrowd={setPickedCrowd}
                setPickedParking={setPickedParking}
                setPickedLine={setPickedLine}
                setPickedWeather={setPickedWeather}
                setReportText={setReportText}
                onSubmit={() => submitMock("제보가 등록됐습니다. 현장 인증 보상 +2가 지급됩니다.")}
              />
            )}
            {activeView === "ask" && (
              <AskScreen
                place={selectedPlace}
                questionText={questionText}
                setQuestionText={setQuestionText}
                onSubmit={() => submitMock("근처 사용자에게 질문을 보냈습니다. 답변이 오면 알림으로 알려드려요.")}
              />
            )}
            {activeView === "my" && <MyScreen onAdmin={() => setActiveView("admin")} />}
            {activeView === "admin" && <AdminScreen />}
          </div>

          <BottomNav activeView={activeView} onChange={setActiveView} />
        </div>

        <OperatorPanel onOpenAdmin={() => setActiveView("admin")} />
      </section>
    </main>
  );
}

function StatusBar() {
  return (
    <div className={styles.statusBar}>
      <span>9:41</span>
      <span className={styles.statusDots}>● ● ▰</span>
    </div>
  );
}

function TopHeader({
  activeView,
  selectedPlace,
  toast,
  onBack,
  onAdmin,
}: {
  activeView: View;
  selectedPlace: Place;
  toast: string;
  onBack: () => void;
  onAdmin: () => void;
}) {
  const isDetail = ["place", "report", "ask", "admin"].includes(activeView);
  const titleMap: Record<View, string> = {
    home: "실시간",
    map: "지도",
    place: selectedPlace.name,
    report: "현장 제보하기",
    ask: "물어보기",
    my: "마이",
    admin: "운영자 화면",
  };

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerRow}>
        <button className={styles.iconButton} type="button" onClick={isDetail ? onBack : onAdmin} aria-label={isDetail ? "뒤로" : "운영자 화면"}>
          {isDetail ? <X size={18} /> : <ShieldCheck size={18} />}
        </button>
        <div>
          <p className={styles.eyebrow}>울산 · 부산 · 경주 베타</p>
          <h1>{titleMap[activeView]}</h1>
        </div>
        <button className={styles.iconButton} type="button" aria-label="알림">
          <Bell size={18} />
        </button>
      </div>
      {activeView !== "admin" && <div className={styles.toast}>{toast}</div>}
    </header>
  );
}

function HomeScreen({ onOpenPlace, onGoMap, onGoReport }: { onOpenPlace: (place: Place) => void; onGoMap: () => void; onGoReport: () => void }) {
  const featured = places[0];

  return (
    <div className={styles.screenStack}>
      <section className={styles.searchCard}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <span>장소, 주차, 줄, 혼잡 검색</span>
        </div>
        <div className={styles.keywordRow}>
          {['해운대 주차', '황리단길 줄', '시청 대기'].map((keyword) => (
            <button key={keyword} type="button">{keyword}</button>
          ))}
        </div>
      </section>

      <section className={`${styles.heroCard} ${styles.busyHero}`}>
        <div>
          <span className={styles.badge}>출발 전 확인</span>
          <h2>지금 가도 되는지 10초 안에 확인하세요.</h2>
          <p>사람 많음, 주차, 줄, 최근 사진을 한 화면에서 보여줍니다.</p>
        </div>
        <button type="button" onClick={() => onOpenPlace(featured)}>
          대표 현장 보기 <ChevronRight size={16} />
        </button>
      </section>

      <section className={styles.sectionBlock}>
        <SectionTitle title="방금 올라온 현장" caption="최근 3시간" />
        <div className={styles.reportGrid}>
          {reports.slice(0, 3).map((report) => {
            const place = places.find((item) => item.id === report.placeId) ?? places[0];
            return <LiveReportCard key={report.id} report={report} place={place} onOpen={() => onOpenPlace(place)} />;
          })}
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <SectionTitle title="지금 많이 확인하는 곳" caption="제보 · 질문 · 길찾기 기준" />
        <div className={styles.rankingList}>
          {places.map((place, index) => (
            <button key={place.id} className={styles.rankingItem} type="button" onClick={() => onOpenPlace(place)}>
              <span className={styles.rank}>{index + 1}</span>
              <div>
                <strong>{place.name}</strong>
                <p>{place.summary}</p>
              </div>
              <span className={styles.visitors}>{place.visitors}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.ctaGrid}>
        <button className={styles.ctaCard} type="button" onClick={onGoMap}>
          <MapPin size={20} />
          <strong>내 주변 지도</strong>
          <span>상태 핀으로 보기</span>
        </button>
        <button className={styles.ctaCard} type="button" onClick={onGoReport}>
          <Camera size={20} />
          <strong>현장 제보</strong>
          <span>물어보기권 받기</span>
        </button>
      </section>

      <AnswerableQuestions />
    </div>
  );
}

function MapScreen({
  activeFilter,
  onFilterChange,
  onOpenPlace,
  selectedPlace,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenPlace: (place: Place) => void;
  selectedPlace: Place;
}) {
  return (
    <div className={styles.mapScreen}>
      <div className={styles.mapSearchRow}>
        <div className={styles.searchBox}>
          <Search size={17} />
          <span>장소 검색</span>
        </div>
        <button className={styles.filterButton} type="button">
          <Filter size={16} /> 필터
        </button>
      </div>

      <div className={styles.filterChips}>
        {filterLabels.map((filter) => (
          <button key={filter} className={filter === activeFilter ? styles.activeFilter : ""} type="button" onClick={() => onFilterChange(filter)}>
            {filter}
          </button>
        ))}
      </div>

      <section className={styles.fakeMap} aria-label="지도 화면 예시">
        <div className={styles.mapBlueCircle} />
        <div className={styles.userLocation}><LocateFixed size={16} /></div>
        {places.map((place) => (
          <button
            key={place.id}
            className={`${styles.mapPin} ${styles[place.tone]}`}
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
            type="button"
            onClick={() => onOpenPlace(place)}
            aria-label={`${place.name} 열기`}
          >
            {pinIcon(place.category)}
          </button>
        ))}
      </section>

      <section className={styles.mapBottomSheet}>
        <div className={styles.sheetHandle} />
        <div className={styles.placeSheetHeader}>
          <div>
            <p className={styles.eyebrow}>선택된 장소</p>
            <h2>{selectedPlace.name}</h2>
          </div>
          <span className={`${styles.statusChip} ${styles[selectedPlace.tone]}`}>{selectedPlace.signal}</span>
        </div>
        <p>{selectedPlace.summary}</p>
        <div className={styles.photoStrip}>
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${styles.photoThumb} ${styles[`photo${item + 1}` as keyof typeof styles]}`} />
          ))}
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => onOpenPlace(selectedPlace)}>
          상세 보기
        </button>
      </section>
    </div>
  );
}

function PlaceScreen({
  place,
  reports,
  onAsk,
  onReport,
  onToast,
}: {
  place: Place;
  reports: Report[];
  onAsk: () => void;
  onReport: () => void;
  onToast: (message: string) => void;
}) {
  const hasSensitivePolicy = place.category === "hospital" || place.category === "public";

  return (
    <div className={styles.screenStack}>
      <section className={`${styles.placeHero} ${styles[place.tone]}`}>
        <div className={styles.placePhotoOverlay}>
          <span>{place.signal}</span>
        </div>
      </section>

      <section className={styles.placeSummaryCard}>
        <div className={styles.placeTitleRow}>
          <div>
            <p className={styles.eyebrow}>{place.address}</p>
            <h2>{place.name}</h2>
          </div>
          <button className={styles.iconButton} type="button" onClick={() => onToast("공유 문구가 복사됐습니다.")}> 
            <Navigation size={18} />
          </button>
        </div>
        <p>{place.summary}</p>
        <div className={styles.statusGrid}>
          <StatusMetric icon={Users} label="사람" value={place.crowd} />
          <StatusMetric icon={CircleParking} label="주차" value={place.parking} />
          <StatusMetric icon={Clock} label="줄" value={place.line} />
          <StatusMetric icon={CloudSun} label="날씨" value={place.weather} />
        </div>
      </section>

      <section className={styles.trustCard}>
        <div>
          <p className={styles.eyebrow}>현장 신뢰도</p>
          <strong>{place.score}%</strong>
          <span>현장 인증과 최근성 기준</span>
        </div>
        <div className={styles.trustRing} style={{ ['--score' as string]: `${place.score}%` }}>
          <ShieldCheck size={24} />
        </div>
      </section>

      {hasSensitivePolicy && (
        <section className={styles.warningCard}>
          <ShieldAlert size={18} />
          <p>병원/관공서 사진은 얼굴, 차량번호, 서류, 민원 내용이 보이면 숨김 처리됩니다.</p>
        </section>
      )}

      <section className={styles.sectionBlock}>
        <SectionTitle title="최근 현장 사진" caption={`${reports.length || 1}건`} />
        <div className={styles.photoStripLarge}>
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${styles.photoLarge} ${styles[`photo${item + 1}` as keyof typeof styles]}`}>
              <span>{item === 0 ? place.updated : item === 1 ? "10분 전" : "20분 전"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <SectionTitle title="현장 인증 제보" caption="최근 3시간" />
        {(reports.length ? reports : [reportsFallback(place)]).map((report) => (
          <LiveReportCard key={report.id} report={report} place={place} />
        ))}
      </section>

      <section className={styles.questionCard}>
        <div>
          <p className={styles.eyebrow}>최근 질문</p>
          <h3>{questions.find((question) => question.placeId === place.id)?.body ?? "지금 현장 상황이 궁금한가요?"}</h3>
        </div>
        <button type="button" onClick={onAsk}>물어보기</button>
      </section>

      <div className={styles.stickyActions}>
        <button className={styles.secondaryButton} type="button" onClick={onAsk}>물어보기</button>
        <button className={styles.primaryButton} type="button" onClick={onReport}>제보하기</button>
      </div>
    </div>
  );
}

function ReportScreen({
  place,
  pickedCrowd,
  pickedParking,
  pickedLine,
  pickedWeather,
  reportText,
  setPickedCrowd,
  setPickedParking,
  setPickedLine,
  setPickedWeather,
  setReportText,
  onSubmit,
}: {
  place: Place;
  pickedCrowd: string;
  pickedParking: string;
  pickedLine: string;
  pickedWeather: string;
  reportText: string;
  setPickedCrowd: (value: string) => void;
  setPickedParking: (value: string) => void;
  setPickedLine: (value: string) => void;
  setPickedWeather: (value: string) => void;
  setReportText: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={styles.screenStack}>
      <section className={styles.formIntroCard}>
        <BadgeCheck size={22} />
        <div>
          <h2>{place.name} 현장 제보</h2>
          <p>정확한 위치는 저장하지 않고 장소와의 거리만 확인합니다.</p>
        </div>
      </section>

      <section className={styles.photoUploadCard}>
        <div className={styles.uploadBox}>
          <Camera size={26} />
          <strong>사진 추가</strong>
          <span>JPG/PNG/WebP · EXIF 제거</span>
        </div>
        <button type="button"><ImageIcon size={16} /> 앨범에서 선택</button>
      </section>

      <ChoiceGroup title="사람 상태" options={reportChips} value={pickedCrowd} onChange={setPickedCrowd} />
      <ChoiceGroup title="주차 상태" options={parkingChips} value={pickedParking} onChange={setPickedParking} />
      <ChoiceGroup title="줄/대기 상태" options={lineChips} value={pickedLine} onChange={setPickedLine} />
      <ChoiceGroup title="날씨/환경" options={weatherChips} value={pickedWeather} onChange={setPickedWeather} />

      <section className={styles.textAreaCard}>
        <label htmlFor="reportText">한 줄 코멘트</label>
        <textarea
          id="reportText"
          value={reportText}
          onChange={(event) => setReportText(event.target.value)}
          placeholder="예: 주차장은 만차고, 해변 중앙은 사람이 많아요."
          maxLength={120}
        />
        <span>{reportText.length}/120</span>
      </section>

      <section className={styles.verifyCard}>
        <LocateFixed size={18} />
        <div>
          <strong>현장 인증 가능</strong>
          <p>장소 반경 안에서만 신뢰도 배지가 붙습니다.</p>
        </div>
        <CheckCircle2 size={18} />
      </section>

      <button className={styles.submitButton} type="button" onClick={onSubmit}>제보 등록하고 +2 받기</button>
    </div>
  );
}

function AskScreen({
  place,
  questionText,
  setQuestionText,
  onSubmit,
}: {
  place: Place;
  questionText: string;
  setQuestionText: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={styles.screenStack}>
      <section className={styles.askHeroCard}>
        <Ticket size={24} />
        <div>
          <p className={styles.eyebrow}>내 물어보기권 3개</p>
          <h2>{place.name} 근처 사용자에게 물어보세요.</h2>
          <span>사진 요청은 2개, 일반 질문은 1개가 차감됩니다.</span>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <SectionTitle title="자주 묻는 예시" caption="바로 선택" />
        <div className={styles.exampleGrid}>
          {questionExamples.map((example) => (
            <button key={example} type="button" onClick={() => setQuestionText(example)}>{example}</button>
          ))}
        </div>
      </section>

      <section className={styles.questionTypeGrid}>
        <QuestionType icon={Users} label="사람/혼잡" active />
        <QuestionType icon={Car} label="주차" />
        <QuestionType icon={Clock} label="줄/대기" />
        <QuestionType icon={Camera} label="사진 요청" />
      </section>

      <section className={styles.textAreaCard}>
        <label htmlFor="questionText">질문 내용</label>
        <textarea
          id="questionText"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          placeholder="궁금한 내용을 구체적으로 작성해 주세요."
          maxLength={120}
        />
        <span>{questionText.length}/120</span>
      </section>

      <section className={styles.warningCard}>
        <AlertTriangle size={18} />
        <p>개인정보, 민원 내용, 환자 정보, 특정인을 알아볼 수 있는 질문은 제한됩니다.</p>
      </section>

      <button className={styles.submitButton} type="button" onClick={onSubmit}>질문 등록</button>
    </div>
  );
}

function MyScreen({ onAdmin }: { onAdmin: () => void }) {
  return (
    <div className={styles.screenStack}>
      <section className={styles.profileCard}>
        <div className={styles.avatar}>🐱</div>
        <div>
          <h2>실시간러버</h2>
          <p>신뢰 점수 85점 · Lv.4</p>
        </div>
        <Settings size={19} />
      </section>

      <section className={styles.myStatsGrid}>
        <StatBox label="제보한 현장" value="24" />
        <StatBox label="답변한 질문" value="7" />
        <StatBox label="받은 추천" value="132" />
      </section>

      <section className={styles.walletCard}>
        <div>
          <p className={styles.eyebrow}>보유 현황</p>
          <h3>물어보기권 3개</h3>
        </div>
        <strong>1,250P</strong>
      </section>

      <section className={styles.menuList}>
        <MenuRow icon={Camera} label="내 제보" />
        <MenuRow icon={MessageCircleQuestion} label="내 질문" />
        <MenuRow icon={Star} label="스크랩한 장소" />
        <MenuRow icon={UserX} label="차단한 사용자" />
        <MenuRow icon={ShieldCheck} label="안전 정책 및 이용 안내" />
        <button className={styles.adminEntry} type="button" onClick={onAdmin}>
          <ShieldAlert size={18} /> 운영자 화면 예시 보기 <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}

function AdminScreen() {
  return (
    <div className={styles.adminScreen}>
      <section className={styles.adminHero}>
        <div>
          <p className={styles.eyebrow}>관리자 전용</p>
          <h2>신고/제보 관리</h2>
          <span>출시 전에는 로그인, 처리 로그, 사진 삭제 플로우를 반드시 연결합니다.</span>
        </div>
        <BarChart3 size={28} />
      </section>

      <div className={styles.adminMetrics}>
        <StatBox label="신고 대기" value="12" />
        <StatBox label="검토 중" value="3" />
        <StatBox label="숨김 처리" value="8" />
      </div>

      <section className={styles.moderationList}>
        <SectionTitle title="우선 검토 큐" caption="위험도 순" />
        {moderationItems.map((item) => (
          <article key={item.id} className={styles.moderationItem}>
            <div className={styles.moderationThumb}><Flag size={18} /></div>
            <div>
              <div className={styles.moderationTitleRow}>
                <strong>{item.type}</strong>
                <span className={item.risk === "높음" ? styles.riskHigh : styles.riskNormal}>{item.risk}</span>
              </div>
              <p>{item.place} · {item.reason}</p>
              <small>{item.age}</small>
            </div>
            <button type="button">숨김</button>
          </article>
        ))}
      </section>
    </div>
  );
}

function OperatorPanel({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  return (
    <aside className={styles.operatorPanel}>
      <div className={styles.operatorHeader}>
        <div>
          <p className={styles.eyebrow}>Desktop Preview</p>
          <h2>운영자 대시보드</h2>
        </div>
        <button type="button" onClick={onOpenAdmin}>앱에서 보기</button>
      </div>

      <div className={styles.operatorMetrics}>
        <StatBox label="오늘 제보" value="128" />
        <StatBox label="질문 응답률" value="74%" />
        <StatBox label="사진 검토" value="9" />
      </div>

      <section className={styles.desktopMapCard}>
        <h3>실시간 지역 상태</h3>
        <div className={styles.miniMap}>
          {places.map((place) => (
            <span key={place.id} className={`${styles.desktopPin} ${styles[place.tone]}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} />
          ))}
        </div>
      </section>

      <section className={styles.desktopQueue}>
        <h3>신고 처리 큐</h3>
        {moderationItems.map((item) => (
          <div key={item.id} className={styles.queueRow}>
            <span>{item.type}</span>
            <strong>{item.risk}</strong>
          </div>
        ))}
      </section>
    </aside>
  );
}

function BottomNav({ activeView, onChange }: { activeView: View; onChange: (view: View) => void }) {
  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeView;
        return (
          <button key={item.id} className={`${styles.navButton} ${isActive ? styles.navActive : ""} ${item.id === "report" ? styles.reportNav : ""}`} type="button" onClick={() => onChange(item.id)}>
            <Icon size={item.id === "report" ? 22 : 19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LiveReportCard({ report, place, onOpen }: { report: Report; place: Place; onOpen?: () => void }) {
  return (
    <button className={styles.liveReportCard} type="button" onClick={onOpen}>
      <div className={`${styles.reportPhoto} ${styles[report.tone]}`}>
        {report.hasPhoto ? <Camera size={18} /> : <Sparkles size={18} />}
      </div>
      <div>
        <span className={`${styles.statusChip} ${styles[report.tone]}`}>{report.verified ? "현장 인증" : "상태 제보"}</span>
        <strong>{place.name}</strong>
        <p>{report.body}</p>
        <small>{report.meta}</small>
      </div>
    </button>
  );
}

function AnswerableQuestions() {
  return (
    <section className={styles.sectionBlock}>
      <SectionTitle title="답변 가능한 질문" caption="답하면 +2" />
      <div className={styles.answerList}>
        {questions.map((question) => {
          const place = places.find((item) => item.id === question.placeId) ?? places[0];
          return (
            <article key={question.id} className={styles.answerItem}>
              <MessageCircleQuestion size={18} />
              <div>
                <strong>{question.body}</strong>
                <p>{place.name} · {question.time}</p>
              </div>
              <span>{question.reward}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ChoiceGroup({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <section className={styles.choiceGroup}>
      <h3>{title}</h3>
      <div>
        {options.map((option) => (
          <button key={option} className={value === option ? styles.choiceActive : ""} type="button" onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </section>
  );
}

function QuestionType({ icon: Icon, label, active = false }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button className={`${styles.questionType} ${active ? styles.questionTypeActive : ""}`} type="button">
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function StatusMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className={styles.statusMetric}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <div className={styles.sectionTitle}>
      <h2>{title}</h2>
      <span>{caption}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statBox}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MenuRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className={styles.menuRow} type="button">
      <Icon size={18} />
      <span>{label}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function pinIcon(category: Category) {
  if (category === "food") return <Utensils size={17} />;
  if (category === "public") return <Building2 size={17} />;
  if (category === "hospital") return <Hospital size={17} />;
  if (category === "parking") return <CircleParking size={17} />;
  return <MapPin size={17} />;
}

function reportsFallback(place: Place): Report {
  return {
    id: `${place.id}-fallback`,
    placeId: place.id,
    title: place.name,
    body: "아직 최근 제보가 부족합니다. 현장에 있다면 첫 제보를 남겨주세요.",
    meta: "대기 중 · 사진 없음",
    tone: place.tone,
    verified: false,
    hasPhoto: false,
  };
}
