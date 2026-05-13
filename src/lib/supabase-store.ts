import {
  type CreditEvent,
  type FlagReason,
  type Place,
  type QuestionType,
  REPORT_TTL_HOURS,
  type ReportCategory,
  type VerifiedRadiusM,
  creditEventForQuestion,
  distanceMeters,
  getCategorySafetyWarning,
  shouldHideForFlags,
  verifiedRadiusFromDistance,
} from "./domain.ts";
import { ApiError } from "./errors.ts";
import { validateStoredPhotoPath } from "./photo-validation.ts";
import {
  createSupabaseServiceClient,
  ensureProfile,
  getOptionalUserId,
  getReportPhotoBucket,
  getRequiredUserId,
  throwSupabaseError,
} from "./supabase-server.ts";
import type {
  AccountDeletionRequestInput,
  AccountDeletionActionInput,
  BlockReportAuthorInput,
  CreateQuestionInput,
  CreateReportInput,
  FlagReportInput,
  ModerationActionInput,
  UnblockUserInput,
} from "./validators.ts";

type PlaceRow = {
  id: string;
  name: string;
  address: string;
  category: ReportCategory;
  latitude: string | number;
  longitude: string | number;
  region: Place["region"];
};

type ReportRow = {
  id: string;
  user_id: string;
  place_id: string;
  category: ReportCategory;
  crowd_level: string;
  line_status: string;
  parking_status: string;
  weather_feel: string;
  comment: string | null;
  photo_path: string | null;
  verified_radius_m: VerifiedRadiusM | null;
  location_verified: boolean;
  created_at: string;
  expires_at: string;
  hidden_at: string | null;
  hidden_reason?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  moderation_flags?: { reason: FlagReason; note: string | null; created_at: string }[];
};

type QuestionRow = {
  id: string;
  user_id: string;
  place_id: string;
  question_type: QuestionType;
  body: string;
  credit_cost: 1 | 2;
  answered_report_id: string | null;
  created_at: string;
};

type StalePhotoUploadRow = {
  bucket_name: string;
  photo_path: string;
};

type AccountDeletionRequestRow = {
  id: string;
  user_id?: string;
  reason?: string | null;
  requested_at: string;
  processed_at?: string | null;
  operator_note?: string | null;
  status: "pending" | "processing" | "completed" | "rejected";
};

type UserBlockRow = {
  blocked_id: string;
  created_at: string;
};

type RpcReportPayload = {
  report: {
    id: string;
    placeId: string;
    category: ReportCategory;
    crowdLevel: string;
    lineStatus: string;
    parkingStatus: string;
    weatherFeel: string;
    comment: string | null;
    photoPath: string | null;
    verifiedRadiusM: VerifiedRadiusM | null;
    locationVerified: boolean;
    createdAt: string;
    expiresAt: string;
    flagCount: number;
    hiddenAt: string | null;
  };
  credits: CreditEvent[];
  balance: number;
};

type RpcQuestionPayload = {
  question: {
    id: string;
    placeId: string;
    questionType: QuestionType;
    body: string;
    creditCost: 1 | 2;
    createdAt: string;
  };
  creditEvent: CreditEvent;
  balance: number;
};

export async function listPlaces() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, address, category, latitude, longitude, region")
    .order("created_at", { ascending: true });

  if (error) {
    throwSupabaseError(error, "PLACES_FETCH_FAILED", "장소 목록을 불러오지 못했습니다.");
  }

  return ((data ?? []) as PlaceRow[]).map((place) => ({
    id: place.id,
    name: place.name,
    address: place.address,
    category: place.category,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    region: place.region,
    safetyWarning: getCategorySafetyWarning(place.category),
  }));
}

export async function listPublicReports(
  filters: { placeId?: string; includeExpired?: boolean } = {},
  options: { request?: Request } = {},
) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("reports")
    .select(
      [
        "id",
        "user_id",
        "place_id",
        "category",
        "crowd_level",
        "line_status",
        "parking_status",
        "weather_feel",
        "comment",
        "photo_path",
        "verified_radius_m",
        "location_verified",
        "created_at",
        "expires_at",
        "hidden_at",
        "moderation_flags(reason,note,created_at)",
      ].join(", "),
    )
    .is("hidden_at", null)
    .order("created_at", { ascending: false });

  if (!filters.includeExpired) {
    query = query.gt("expires_at", new Date().toISOString());
  }

  if (filters.placeId) {
    query = query.eq("place_id", filters.placeId);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error, "REPORTS_FETCH_FAILED", "제보 목록을 불러오지 못했습니다.");
  }

  const blockedUserIds = await getBlockedUserIdsForRequest(options.request);
  const visibleReports = ((data ?? []) as unknown as ReportRow[]).filter((report) => !blockedUserIds.has(report.user_id));

  return Promise.all(visibleReports.map(mapReportRowForPublic));
}

export async function createReport(input: CreateReportInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);

  if (input.photoPath) {
    validateStoredPhotoPath(input.photoPath);
  }

  const place = await findPlace(input.placeId);

  if (input.category !== place.category) {
    throw new ApiError(400, "CATEGORY_MISMATCH", "제보 카테고리가 장소 카테고리와 일치하지 않습니다.");
  }

  const verifiedRadiusM = input.clientLocation
    ? verifiedRadiusFromDistance(
        distanceMeters(input.clientLocation, {
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
        }),
      )
    : null;

  if (input.clientLocation && !verifiedRadiusM) {
    throw new ApiError(403, "LOCATION_NOT_VERIFIED", "현장 인증은 장소 300m 이내에서만 가능합니다.", {
      maxRadiusM: 300,
    });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("create_report_with_credits", {
    p_user_id: userId,
    p_place_id: input.placeId,
    p_category: input.category,
    p_crowd_level: input.crowdLevel,
    p_line_status: input.lineStatus,
    p_parking_status: input.parkingStatus,
    p_weather_feel: input.weatherFeel,
    p_comment: input.comment || null,
    p_photo_path: input.photoPath || null,
    p_verified_radius_m: verifiedRadiusM,
    p_location_verified: Boolean(verifiedRadiusM),
    p_answer_question_id: input.answerQuestionId || null,
  });

  if (error) {
    throwSupabaseError(error, "REPORT_CREATE_FAILED", "제보 저장에 실패했습니다.");
  }

  const payload = data as RpcReportPayload;
  const report = await mapRpcReportForPublic(payload.report);

  return {
    report,
    credits: payload.credits,
    balance: payload.balance,
    safetyWarning: getCategorySafetyWarning(input.category),
    privacyNotice: verifiedRadiusM
      ? "정확한 위치는 현장 확인에만 쓰고 저장하지 않습니다."
      : "현장 인증 없이 등록되어 낮은 신뢰도로 표시됩니다.",
    storage: input.photoPath
      ? {
          bucket: getReportPhotoBucket(),
          path: input.photoPath,
        }
      : null,
  };
}

export async function listPublicQuestions(placeId?: string, options: { request?: Request } = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("questions")
    .select("id, user_id, place_id, question_type, body, credit_cost, answered_report_id, created_at")
    .order("created_at", { ascending: false });

  if (placeId) {
    query = query.eq("place_id", placeId);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error, "QUESTIONS_FETCH_FAILED", "물어보기 목록을 불러오지 못했습니다.");
  }

  const blockedUserIds = await getBlockedUserIdsForRequest(options.request);
  return ((data ?? []) as QuestionRow[])
    .filter((question) => !blockedUserIds.has(question.user_id))
    .map((question) => ({
      id: question.id,
      placeId: question.place_id,
      questionType: question.question_type,
      body: question.body,
      creditCost: question.credit_cost,
      answeredReportId: question.answered_report_id,
      createdAt: question.created_at,
    }));
}

export async function listMyQuestions(options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const { data, error } = await createSupabaseServiceClient()
    .from("questions")
    .select("id, user_id, place_id, question_type, body, credit_cost, answered_report_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throwSupabaseError(error, "MY_QUESTIONS_FETCH_FAILED", "내 질문 목록을 불러오지 못했습니다.");
  }

  return ((data ?? []) as QuestionRow[]).map(mapQuestionRowForOwner);
}

export async function createQuestion(input: CreateQuestionInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("create_question_with_credit", {
    p_user_id: userId,
    p_place_id: input.placeId,
    p_question_type: input.questionType,
    p_body: input.body,
  });

  if (error) {
    throwSupabaseError(error, "QUESTION_CREATE_FAILED", "물어보기 등록에 실패했습니다.");
  }

  const payload = data as RpcQuestionPayload;

  return {
    question: payload.question,
    creditEvent: payload.creditEvent ?? creditEventForQuestion(input.questionType),
    balance: payload.balance,
    trustBoundary: "보유한 물어보기권 기준으로만 등록됩니다.",
  };
}

export async function flagReport(input: FlagReportInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const supabase = createSupabaseServiceClient();
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, hidden_at")
    .eq("id", input.reportId)
    .maybeSingle();

  if (reportError) {
    throwSupabaseError(reportError, "REPORT_LOOKUP_FAILED", "제보를 확인하지 못했습니다.");
  }

  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
  }

  const { error: insertError } = await supabase.from("moderation_flags").insert({
    report_id: input.reportId,
    reporter_id: userId,
    reason: input.reason,
    note: input.note || null,
  });

  if (insertError && insertError.code !== "23505") {
    throwSupabaseError(insertError, "FLAG_CREATE_FAILED", "신고 접수에 실패했습니다.");
  }

  const flagReasons = await getFlagReasons(input.reportId);
  const shouldHide = shouldHideForFlags(flagReasons);

  if (!report.hidden_at && shouldHide) {
    const { error: updateError } = await hideReportWithOptionalPhotoDelete(input.reportId, {
      hidden_at: new Date().toISOString(),
      hidden_reason: "신고 정책에 따른 자동 숨김",
    });

    if (updateError) {
      throwSupabaseError(updateError, "REPORT_HIDE_FAILED", "신고된 제보를 숨기지 못했습니다.");
    }
  }

  return {
    reportId: input.reportId,
    hidden: Boolean(report.hidden_at || shouldHide),
    flagCount: flagReasons.length,
    hideRule: "privacy/sensitive 1건, 허위 2건, 전체 신고 3건 이상이면 자동 숨김 처리",
  };
}

export async function listUserBlocks(options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const { data, error } = await createSupabaseServiceClient()
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throwSupabaseError(error, "USER_BLOCKS_FETCH_FAILED", "차단 목록을 불러오지 못했습니다.");
  }

  return ((data ?? []) as UserBlockRow[]).map((block) => ({
    blockedUserId: block.blocked_id,
    label: blockedUserLabel(block.blocked_id),
    createdAt: block.created_at,
  }));
}

export async function blockReportAuthor(input: BlockReportAuthorInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const supabase = createSupabaseServiceClient();
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id")
    .eq("id", input.reportId)
    .maybeSingle();

  if (reportError) {
    throwSupabaseError(reportError, "REPORT_LOOKUP_FAILED", "제보를 확인하지 못했습니다.");
  }

  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "제보를 찾을 수 없습니다.");
  }

  const blockedUserId = String(report.user_id);
  if (blockedUserId === userId) {
    throw new ApiError(400, "SELF_BLOCK_NOT_ALLOWED", "내 제보 작성자는 차단할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("user_blocks")
    .upsert(
      {
        blocker_id: userId,
        blocked_id: blockedUserId,
      },
      { onConflict: "blocker_id,blocked_id" },
    )
    .select("blocked_id, created_at")
    .single();

  if (error) {
    throwSupabaseError(error, "USER_BLOCK_CREATE_FAILED", "사용자 차단에 실패했습니다.");
  }

  const block = data as UserBlockRow;

  return {
    blockedUserId: block.blocked_id,
    label: blockedUserLabel(block.blocked_id),
    createdAt: block.created_at,
  };
}

export async function unblockUser(input: UnblockUserInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const { error } = await createSupabaseServiceClient()
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", input.blockedUserId);

  if (error) {
    throwSupabaseError(error, "USER_BLOCK_DELETE_FAILED", "사용자 차단 해제에 실패했습니다.");
  }

  return {
    blockedUserId: input.blockedUserId,
    unblocked: true,
  };
}

export async function getModerationQueue() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      [
        "id",
        "place_id",
        "category",
        "crowd_level",
        "line_status",
        "parking_status",
        "weather_feel",
        "comment",
        "photo_path",
        "verified_radius_m",
        "location_verified",
        "created_at",
        "expires_at",
        "hidden_at",
        "hidden_reason",
        "handled_by",
        "handled_at",
        "moderation_flags(reason,note,created_at)",
      ].join(", "),
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throwSupabaseError(error, "MODERATION_QUEUE_FAILED", "신고 큐를 불러오지 못했습니다.");
  }

  return Promise.all(((data ?? []) as unknown as ReportRow[])
    .filter((report) => Boolean(report.hidden_at) || (report.moderation_flags?.length ?? 0) > 0)
    .map(async (report) => ({
      ...(await mapReportRowForPublic(report)),
      flagReasons: report.moderation_flags?.map((flag) => flag.reason) ?? [],
      status: report.hidden_at ? "hidden" : "needs_review",
      hiddenReason: report.hidden_reason ?? null,
      handledBy: report.handled_by ?? null,
      handledAt: report.handled_at ?? null,
    })));
}

export async function handleModerationAction(input: ModerationActionInput) {
  const handledAt = new Date().toISOString();
  const update =
    input.action === "hide"
      ? {
          hidden_at: handledAt,
          hidden_reason: input.reason || "운영자 숨김",
          handled_by: input.handledBy || null,
          handled_at: handledAt,
        }
      : {
          hidden_at: null,
          hidden_reason: null,
          handled_by: input.handledBy || null,
          handled_at: handledAt,
        };

  const { error } = input.action === "hide"
    ? await hideReportWithOptionalPhotoDelete(input.reportId, update)
    : await createSupabaseServiceClient().from("reports").update(update).eq("id", input.reportId);

  if (error) {
    throwSupabaseError(error, "MODERATION_ACTION_FAILED", "신고 처리에 실패했습니다.");
  }

  return {
    reportId: input.reportId,
    action: input.action,
    handledAt,
  };
}

export async function cleanupUnusedReportPhotos(before = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("list_stale_report_photo_uploads", {
    p_before: before.toISOString(),
  });

  if (error) {
    throwSupabaseError(error, "STALE_PHOTO_LOOKUP_FAILED", "미사용 사진 목록을 확인하지 못했습니다.");
  }

  const staleUploads = (data ?? []) as StalePhotoUploadRow[];
  if (staleUploads.length === 0) {
    return { deleted: 0 };
  }

  const pathsByBucket = new Map<string, string[]>();
  for (const upload of staleUploads) {
    const bucketPaths = pathsByBucket.get(upload.bucket_name) ?? [];
    bucketPaths.push(upload.photo_path);
    pathsByBucket.set(upload.bucket_name, bucketPaths);
  }

  for (const [bucketName, photoPaths] of pathsByBucket.entries()) {
    const { error: removeError } = await supabase.storage.from(bucketName).remove(photoPaths);

    if (removeError) {
      throwSupabaseError(removeError, "STALE_PHOTO_DELETE_FAILED", "미사용 사진 파일을 삭제하지 못했습니다.");
    }
  }

  const { error: deleteError } = await supabase
    .from("report_photo_uploads")
    .delete()
    .in("photo_path", staleUploads.map((upload) => upload.photo_path))
    .is("consumed_at", null);

  if (deleteError) {
    throwSupabaseError(deleteError, "STALE_PHOTO_RECORD_DELETE_FAILED", "미사용 사진 기록을 삭제하지 못했습니다.");
  }

  return { deleted: staleUploads.length };
}

export async function requestAccountDeletion(input: AccountDeletionRequestInput, options: { request: Request }) {
  const userId = await getRequiredUserId(options.request);
  await ensureProfile(userId);

  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("account_deletion_requests")
    .select("id, requested_at, status")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    throwSupabaseError(existingError, "ACCOUNT_DELETION_FETCH_FAILED", "계정 삭제 요청을 확인하지 못했습니다.");
  }

  if (existing) {
    const request = existing as AccountDeletionRequestRow;

    return {
      id: request.id,
      requestedAt: request.requested_at,
      status: request.status,
    };
  }

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .insert({
      user_id: userId,
      reason: input.reason ?? null,
    })
    .select("id, requested_at, status")
    .single();

  if (error) {
    throwSupabaseError(error, "ACCOUNT_DELETION_REQUEST_FAILED", "계정 삭제 요청을 저장하지 못했습니다.");
  }

  const request = data as AccountDeletionRequestRow;

  return {
    id: request.id,
    requestedAt: request.requested_at,
    status: request.status,
  };
}

export async function listAccountDeletionRequests() {
  const { data, error } = await createSupabaseServiceClient()
    .from("account_deletion_requests")
    .select("id, user_id, reason, status, requested_at, processed_at, operator_note")
    .order("requested_at", { ascending: false })
    .limit(100);

  if (error) {
    throwSupabaseError(error, "ACCOUNT_DELETION_QUEUE_FAILED", "계정 삭제 요청 큐를 불러오지 못했습니다.");
  }

  return ((data ?? []) as AccountDeletionRequestRow[]).map(mapAccountDeletionRequestForAdmin);
}

export async function handleAccountDeletionRequest(input: AccountDeletionActionInput) {
  const processedAt = input.status === "processing" ? null : new Date().toISOString();
  const { data, error } = await createSupabaseServiceClient()
    .from("account_deletion_requests")
    .update({
      status: input.status,
      processed_at: processedAt,
      operator_note: input.operatorNote ?? null,
    })
    .eq("id", input.requestId)
    .select("id, user_id, reason, status, requested_at, processed_at, operator_note")
    .single();

  if (error) {
    throwSupabaseError(error, "ACCOUNT_DELETION_ACTION_FAILED", "계정 삭제 요청 처리 상태를 저장하지 못했습니다.");
  }

  return mapAccountDeletionRequestForAdmin(data as AccountDeletionRequestRow);
}

async function findPlace(placeId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, address, category, latitude, longitude, region")
    .eq("id", placeId)
    .maybeSingle();

  if (error) {
    throwSupabaseError(error, "PLACE_LOOKUP_FAILED", "장소를 확인하지 못했습니다.");
  }

  if (!data) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다.");
  }

  return data as PlaceRow;
}

async function getFlagReasons(reportId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("moderation_flags").select("reason").eq("report_id", reportId);

  if (error) {
    throwSupabaseError(error, "FLAGS_FETCH_FAILED", "신고 사유를 확인하지 못했습니다.");
  }

  return ((data ?? []) as { reason: FlagReason }[]).map((flag) => flag.reason);
}

async function mapReportRowForPublic(report: ReportRow) {
  return {
    id: report.id,
    placeId: report.place_id,
    category: report.category,
    crowdLevel: report.crowd_level,
    lineStatus: report.line_status,
    parkingStatus: report.parking_status,
    weatherFeel: report.weather_feel,
    comment: report.comment,
    photoUrl: await signedPhotoUrl(report.photo_path),
    verifiedRadiusM: report.verified_radius_m,
    locationVerified: report.location_verified,
    createdAt: report.created_at,
    expiresAt: report.expires_at,
    flagCount: report.moderation_flags?.length ?? 0,
    hiddenAt: report.hidden_at,
  };
}

async function mapRpcReportForPublic(report: RpcReportPayload["report"]) {
  return {
    id: report.id,
    placeId: report.placeId,
    category: report.category,
    crowdLevel: report.crowdLevel,
    lineStatus: report.lineStatus,
    parkingStatus: report.parkingStatus,
    weatherFeel: report.weatherFeel,
    comment: report.comment,
    photoUrl: await signedPhotoUrl(report.photoPath),
    verifiedRadiusM: report.verifiedRadiusM,
    locationVerified: report.locationVerified,
    createdAt: report.createdAt,
    expiresAt: report.expiresAt,
    flagCount: report.flagCount,
    hiddenAt: report.hiddenAt,
  };
}

async function signedPhotoUrl(photoPath: string | null) {
  if (!photoPath) {
    return null;
  }

  const { data, error } = await createSupabaseServiceClient()
    .storage
    .from(getReportPhotoBucket())
    .createSignedUrl(photoPath, 5 * 60);

  if (error) {
    throwSupabaseError(error, "PHOTO_URL_FAILED", "사진 URL 생성에 실패했습니다.");
  }

  return data.signedUrl;
}

async function getBlockedUserIdsForRequest(request?: Request) {
  if (!request) {
    return new Set<string>();
  }

  const userId = await getOptionalUserId(request);
  if (!userId) {
    return new Set<string>();
  }

  const { data, error } = await createSupabaseServiceClient()
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) {
    throwSupabaseError(error, "USER_BLOCKS_FETCH_FAILED", "차단 목록을 확인하지 못했습니다.");
  }

  return new Set(((data ?? []) as Pick<UserBlockRow, "blocked_id">[]).map((block) => block.blocked_id));
}

function blockedUserLabel(blockedUserId: string) {
  return `익명 사용자 ${blockedUserId.slice(0, 8)}`;
}

function mapQuestionRowForOwner(question: QuestionRow) {
  return {
    id: question.id,
    placeId: question.place_id,
    questionType: question.question_type,
    body: question.body,
    creditCost: question.credit_cost,
    answeredReportId: question.answered_report_id,
    createdAt: question.created_at,
    status: questionStatus(question),
  };
}

function questionStatus(question: Pick<QuestionRow, "answered_report_id" | "created_at">, now = new Date()) {
  if (question.answered_report_id) {
    return "answered";
  }

  const expiresAt = new Date(new Date(question.created_at).getTime() + REPORT_TTL_HOURS * 60 * 60 * 1000);
  if (expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return "pending";
}

function mapAccountDeletionRequestForAdmin(request: AccountDeletionRequestRow) {
  const userId = request.user_id ?? "unknown";

  return {
    id: request.id,
    userId,
    label: `익명 계정 ${userId.slice(0, 8)}`,
    reason: request.reason ?? null,
    status: request.status,
    requestedAt: request.requested_at,
    processedAt: request.processed_at ?? null,
    operatorNote: request.operator_note ?? null,
  };
}

async function hideReportWithOptionalPhotoDelete(reportId: string, update: Record<string, unknown>) {
  const supabase = createSupabaseServiceClient();
  const { data: report, error: lookupError } = await supabase
    .from("reports")
    .select("photo_path")
    .eq("id", reportId)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError };
  }

  const photoPath = typeof report?.photo_path === "string" ? report.photo_path : null;
  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ...update,
      ...(photoPath ? { photo_path: null } : {}),
    })
    .eq("id", reportId);

  if (updateError) {
    return { error: updateError };
  }

  if (photoPath) {
    const { error: storageError } = await supabase.storage.from(getReportPhotoBucket()).remove([photoPath]);
    if (storageError) {
      return { error: storageError };
    }
  }

  return { error: null };
}
