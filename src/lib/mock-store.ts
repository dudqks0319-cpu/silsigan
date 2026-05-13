import {
  type FlagReason,
  type CreditEvent,
  type Place,
  REPORT_TTL_HOURS,
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
import { sanitizePhotoUpload } from "./photo-validation.ts";
import type {
  AccountDeletionRequestInput,
  AccountDeletionActionInput,
  BlockReportAuthorInput,
  CreateQuestionInput,
  CreateReportInput,
  FlagReportInput,
  UnblockUserInput,
} from "./validators.ts";

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

const demoNow = new Date();

const reports: StoredReport[] = [
  {
    id: "report_seed_ulsan_1",
    userId: "seed-reporter-ulsan",
    placeId: "ulsan-taehwagang",
    category: "tourism",
    crowdLevel: "normal",
    lineStatus: "short",
    parkingStatus: "limited",
    weatherFeel: "windy",
    comment: "잔디광장은 여유 있는데 주차장은 조금 붐벼요.",
    photoUrl: "mock://taehwagang-parking",
    verifiedRadiusM: 50,
    locationVerified: true,
    createdAt: new Date(demoNow.getTime() - 4 * 60 * 1000).toISOString(),
    expiresAt: getReportExpiry(new Date(demoNow.getTime() - 4 * 60 * 1000)).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  },
  {
    id: "report_seed_busan_1",
    userId: "seed-reporter-busan",
    placeId: "busan-gwangalli",
    category: "tourism",
    crowdLevel: "packed",
    lineStatus: "medium",
    parkingStatus: "full",
    weatherFeel: "good",
    comment: "해변 앞 보행 통로가 막히기 시작했고 공영주차장은 만차예요.",
    photoUrl: "mock://gwangalli-event",
    verifiedRadiusM: 150,
    locationVerified: true,
    createdAt: new Date(demoNow.getTime() - 8 * 60 * 1000).toISOString(),
    expiresAt: getReportExpiry(new Date(demoNow.getTime() - 8 * 60 * 1000)).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  },
  {
    id: "report_seed_gyeongju_1",
    userId: "seed-reporter-gyeongju",
    placeId: "gyeongju-hwangridan",
    category: "restaurant_cafe",
    crowdLevel: "busy",
    lineStatus: "medium",
    parkingStatus: "limited",
    weatherFeel: "good",
    comment: "인기 카페는 20분 정도 기다리고 골목 이동은 가능해요.",
    photoUrl: "mock://hwangridan-cafe",
    verifiedRadiusM: 50,
    locationVerified: true,
    createdAt: new Date(demoNow.getTime() - 12 * 60 * 1000).toISOString(),
    expiresAt: getReportExpiry(new Date(demoNow.getTime() - 12 * 60 * 1000)).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  },
  {
    id: "report_seed_office_1",
    userId: "seed-reporter-office",
    placeId: "ulsan-city-hall",
    category: "public_office",
    crowdLevel: "normal",
    lineStatus: "short",
    parkingStatus: "limited",
    weatherFeel: "rainy",
    comment: "민원 창구 대기는 많지 않고 주차장은 입구 쪽이 붐벼요.",
    photoUrl: null,
    verifiedRadiusM: 150,
    locationVerified: true,
    createdAt: new Date(demoNow.getTime() - 16 * 60 * 1000).toISOString(),
    expiresAt: getReportExpiry(new Date(demoNow.getTime() - 16 * 60 * 1000)).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  },
];

const questions: StoredQuestion[] = [
  {
    id: "question_seed_1",
    userId: "seed-question-ulsan",
    placeId: "ulsan-taehwagang",
    questionType: "parking",
    body: "지금 국가정원 공영주차장 들어갈 수 있나요?",
    creditCost: 1,
    answeredReportId: null,
    createdAt: new Date(demoNow.getTime() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: "question_seed_2",
    userId: "seed-question-busan",
    placeId: "busan-gwangalli",
    questionType: "photo_request",
    body: "무대 앞쪽 사진으로 볼 수 있을까요?",
    creditCost: 2,
    answeredReportId: null,
    createdAt: new Date(demoNow.getTime() - 10 * 60 * 1000).toISOString(),
  },
];

const flagsByReportId = new Map<string, FlagReason[]>();
const creditEventsByActorId = new Map<string, CreditEvent[]>();
type MockAccountDeletionRequest = {
  id: string;
  userId: string;
  reason: string | null;
  requestedAt: string;
  processedAt: string | null;
  operatorNote: string | null;
  status: "pending" | "processing" | "completed" | "rejected";
};

const accountDeletionRequestsByActorId = new Map<string, MockAccountDeletionRequest>();
const blockedUsersByActorId = new Map<string, Map<string, string>>();

type CreateQuestionOptions = {
  actorId?: string;
  getCreditBalance?: () => number;
  recordCreditEvent?: (event: ReturnType<typeof creditEventForQuestion>) => void;
};

function seedCredits() {
  return [{ type: "signup_bonus" as const, amount: 3 }];
}

export function listPlaces() {
  return mockPlaces.map((place) => ({
    ...place,
    safetyWarning: getCategorySafetyWarning(place.category),
  }));
}

export function listReports(
  filters: { placeId?: string; includeExpired?: boolean } = {},
  options: { actorId?: string } = {},
) {
  const now = new Date();
  const blockedUsers = getBlockedUsers(options.actorId);

  return reports.filter((report) => {
    if (blockedUsers.has(report.userId)) {
      return false;
    }

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

export function listPublicReports(
  filters: { placeId?: string; includeExpired?: boolean } = {},
  options: { actorId?: string } = {},
) {
  return listReports(filters, options).map(maskReportForPublic);
}

export function createReport(input: CreateReportInput, options: { actorId?: string } = {}) {
  const place = findPlace(input.placeId);
  if (input.category !== place.category) {
    throw new ApiError(400, "CATEGORY_MISMATCH", "제보 카테고리가 장소 카테고리와 일치하지 않습니다.");
  }

  const sanitizedPhoto = input.photoMime && input.photoSizeBytes !== undefined
    ? sanitizePhotoUpload({
        name: input.photoName ?? "field-report.jpg",
        mimeType: input.photoMime,
        sizeBytes: input.photoSizeBytes,
      })
    : null;

  const verifiedRadiusM = input.clientLocation
    ? verifiedRadiusFromDistance(
        distanceMeters(input.clientLocation, {
          latitude: place.latitude,
          longitude: place.longitude,
        }),
      )
    : null;

  if (input.clientLocation && !verifiedRadiusM) {
    throw new ApiError(403, "LOCATION_NOT_VERIFIED", "현장 인증은 장소 300m 이내에서만 가능합니다.", {
      maxRadiusM: 300,
    });
  }

  const now = new Date();
  const report: StoredReport = {
    id: `report_${crypto.randomUUID()}`,
    userId: options.actorId ?? "demo-user",
    placeId: input.placeId,
    category: input.category,
    crowdLevel: input.crowdLevel,
    lineStatus: input.lineStatus,
    parkingStatus: input.parkingStatus,
    weatherFeel: input.weatherFeel,
    comment: input.comment || null,
    photoUrl: sanitizedPhoto ? `mock-storage://${sanitizedPhoto.storagePath}` : input.photoUrl || null,
    verifiedRadiusM,
    locationVerified: Boolean(verifiedRadiusM),
    createdAt: now.toISOString(),
    expiresAt: getReportExpiry(now).toISOString(),
    flagCount: 0,
    hiddenAt: null,
  };

  const credits = creditEventsForReport(Boolean(verifiedRadiusM), Boolean(report.photoUrl));
  const answeredQuestion = input.answerQuestionId ? findAnswerableQuestion(input.answerQuestionId, input.placeId) : null;

  if (answeredQuestion && !verifiedRadiusM) {
    throw new ApiError(403, "ANSWER_LOCATION_REQUIRED", "질문 답변 보상은 현장 인증 제보에만 지급됩니다.");
  }

  if (answeredQuestion) {
    answeredQuestion.answeredReportId = report.id;
    credits.push({ type: "answer_question", amount: 2 });
  }

  reports.unshift(report);
  addCredits(options.actorId ?? "demo-user", credits);

  return {
    report: maskReportForPublic(report),
    credits,
    balance: getCreditBalance(options.actorId ?? "demo-user"),
    ...(sanitizedPhoto ? { photo: sanitizedPhoto } : {}),
    safetyWarning: getCategorySafetyWarning(input.category),
    privacyNotice: verifiedRadiusM
      ? "정확한 위치는 현장 확인에만 쓰고 저장하지 않습니다."
      : "현장 인증 없이 등록되어 낮은 신뢰도로 표시됩니다.",
  };
}

export function listQuestions(placeId?: string, options: { actorId?: string } = {}) {
  const blockedUsers = getBlockedUsers(options.actorId);

  return questions.filter((question) => {
    if (blockedUsers.has(question.userId)) {
      return false;
    }

    return !placeId || question.placeId === placeId;
  });
}

export function listPublicQuestions(placeId?: string, options: { actorId?: string } = {}) {
  return listQuestions(placeId, options).map(maskQuestionForPublic);
}

export function listMyQuestions(options: { actorId?: string } = {}) {
  const actorId = options.actorId ?? "demo-user";

  return questions
    .filter((question) => question.userId === actorId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(maskQuestionForOwner);
}

export function createQuestion(input: CreateQuestionInput, options: CreateQuestionOptions = {}) {
  findPlace(input.placeId);

  const creditCost = getQuestionCost(input.questionType);
  const actorId = options.actorId ?? "demo-user";
  const getBalance = options.getCreditBalance ?? (() => getCreditBalance(actorId));
  const availableCredits = getBalance();

  if (availableCredits < creditCost) {
    throw new ApiError(402, "INSUFFICIENT_CREDITS", "물어보기권이 부족합니다.", {
      requiredCredits: creditCost,
      availableCredits,
    });
  }

  const creditEvent = creditEventForQuestion(input.questionType);
  if (options.recordCreditEvent) {
    options.recordCreditEvent(creditEvent);
  } else {
    addCredits(actorId, [creditEvent]);
  }

  const question: StoredQuestion = {
    id: `question_${crypto.randomUUID()}`,
    userId: actorId,
    placeId: input.placeId,
    questionType: input.questionType,
    body: input.body,
    creditCost,
    answeredReportId: null,
    createdAt: new Date().toISOString(),
  };

  questions.unshift(question);

  return {
    question: maskQuestionForPublic(question),
    creditEvent,
    balance: getCreditBalance(actorId),
    trustBoundary: "보유한 물어보기권 기준으로만 등록됩니다.",
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

export function listUserBlocks(options: { actorId?: string } = {}) {
  return Array.from(getBlockedUsers(options.actorId).entries()).map(([blockedUserId, createdAt]) => ({
    blockedUserId,
    label: blockedUserLabel(blockedUserId),
    createdAt,
  }));
}

export function blockReportAuthor(input: BlockReportAuthorInput, options: { actorId?: string } = {}) {
  const actorId = options.actorId ?? "demo-user";
  const report = reports.find((candidate) => candidate.id === input.reportId);

  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
  }

  if (report.userId === actorId) {
    throw new ApiError(400, "SELF_BLOCK_NOT_ALLOWED", "내 제보 작성자는 차단할 수 없습니다.");
  }

  const blockedUsers = getBlockedUsers(actorId);
  const createdAt = blockedUsers.get(report.userId) ?? new Date().toISOString();
  blockedUsers.set(report.userId, createdAt);

  return {
    blockedUserId: report.userId,
    label: blockedUserLabel(report.userId),
    createdAt,
  };
}

export function unblockUser(input: UnblockUserInput, options: { actorId?: string } = {}) {
  const actorId = options.actorId ?? "demo-user";
  const blockedUsers = getBlockedUsers(actorId);
  blockedUsers.delete(input.blockedUserId);

  return {
    blockedUserId: input.blockedUserId,
    unblocked: true,
  };
}

export function getCreditBalance(actorId = "demo-user") {
  const events = creditEventsByActorId.get(actorId) ?? seedCredits();
  creditEventsByActorId.set(actorId, events);

  return events.reduce((balance, event) => balance + event.amount, 0);
}

export function getModerationQueue() {
  return reports
    .filter((report) => report.flagCount > 0 || report.hiddenAt)
    .map((report) => ({
      ...maskReportForPublic(report),
      flagReasons: flagsByReportId.get(report.id) ?? [],
      status: report.hiddenAt ? "hidden" : "needs_review",
    }));
}

export function requestAccountDeletion(input: AccountDeletionRequestInput, options: { actorId?: string } = {}) {
  const actorId = options.actorId ?? "demo-user";
  const existing = accountDeletionRequestsByActorId.get(actorId);

  if (existing && existing.status === "pending") {
    return existing;
  }

  const request = {
    id: `account_deletion_${crypto.randomUUID()}`,
    userId: actorId,
    requestedAt: new Date().toISOString(),
    processedAt: null,
    operatorNote: null,
    status: "pending" as const,
    reason: input.reason ?? null,
  };

  accountDeletionRequestsByActorId.set(actorId, request);

  return request;
}

export function listAccountDeletionRequests() {
  return Array.from(accountDeletionRequestsByActorId.values())
    .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime())
    .map(maskAccountDeletionRequestForAdmin);
}

export function handleAccountDeletionRequest(input: AccountDeletionActionInput) {
  const request = Array.from(accountDeletionRequestsByActorId.values()).find((candidate) => candidate.id === input.requestId);

  if (!request) {
    throw new ApiError(404, "ACCOUNT_DELETION_NOT_FOUND", "계정 삭제 요청을 찾지 못했습니다.");
  }

  request.status = input.status;
  request.operatorNote = input.operatorNote ?? request.operatorNote;
  request.processedAt = input.status === "processing" ? null : new Date().toISOString();

  return maskAccountDeletionRequestForAdmin(request);
}

function addCredits(actorId: string, events: ReturnType<typeof creditEventsForReport>) {
  const currentEvents = creditEventsByActorId.get(actorId) ?? seedCredits();
  currentEvents.push(...events);
  creditEventsByActorId.set(actorId, currentEvents);
}

function maskReportForPublic(report: StoredReport) {
  return {
    id: report.id,
    placeId: report.placeId,
    category: report.category,
    crowdLevel: report.crowdLevel,
    lineStatus: report.lineStatus,
    parkingStatus: report.parkingStatus,
    weatherFeel: report.weatherFeel,
    comment: report.comment,
    photoUrl: report.photoUrl,
    verifiedRadiusM: report.verifiedRadiusM,
    locationVerified: report.locationVerified,
    createdAt: report.createdAt,
    expiresAt: report.expiresAt,
    flagCount: report.flagCount,
    hiddenAt: report.hiddenAt,
  };
}

function getBlockedUsers(actorId = "demo-user") {
  const current = blockedUsersByActorId.get(actorId);
  if (current) {
    return current;
  }

  const next = new Map<string, string>();
  blockedUsersByActorId.set(actorId, next);

  return next;
}

function blockedUserLabel(blockedUserId: string) {
  return `익명 사용자 ${blockedUserId.slice(0, 8)}`;
}

function maskQuestionForPublic(question: StoredQuestion) {
  return {
    id: question.id,
    placeId: question.placeId,
    questionType: question.questionType,
    body: question.body,
    creditCost: question.creditCost,
    answeredReportId: question.answeredReportId,
    createdAt: question.createdAt,
  };
}

function maskQuestionForOwner(question: StoredQuestion) {
  return {
    ...maskQuestionForPublic(question),
    status: questionStatus(question),
  };
}

function questionStatus(question: StoredQuestion, now = new Date()) {
  if (question.answeredReportId) {
    return "answered";
  }

  const expiresAt = new Date(new Date(question.createdAt).getTime() + REPORT_TTL_HOURS * 60 * 60 * 1000);
  if (expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return "pending";
}

function maskAccountDeletionRequestForAdmin(request: MockAccountDeletionRequest) {
  return {
    id: request.id,
    userId: request.userId,
    label: `익명 계정 ${request.userId.slice(0, 8)}`,
    reason: request.reason,
    status: request.status,
    requestedAt: request.requestedAt,
    processedAt: request.processedAt,
    operatorNote: request.operatorNote,
  };
}

function findPlace(placeId: string) {
  const place = mockPlaces.find((candidate) => candidate.id === placeId);
  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다.");
  }

  return place;
}

function findAnswerableQuestion(questionId: string, placeId: string) {
  const question = questions.find((candidate) => candidate.id === questionId && candidate.placeId === placeId);

  if (!question || question.answeredReportId) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "답변할 물어보기를 찾지 못했습니다.");
  }

  return question;
}
