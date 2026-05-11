import {
  type CreditEvent,
  type FlagReason,
  type Place,
  type QuestionType,
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
  getReportPhotoBucket,
  getRequiredUserId,
  throwSupabaseError,
} from "./supabase-server.ts";
import type { CreateQuestionInput, CreateReportInput, FlagReportInput, ModerationActionInput } from "./validators.ts";

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
  place_id: string;
  question_type: QuestionType;
  body: string;
  credit_cost: 1 | 2;
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

export async function listPublicReports(filters: { placeId?: string; includeExpired?: boolean } = {}) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
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

  return Promise.all(((data ?? []) as unknown as ReportRow[]).map(mapReportRowForPublic));
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

export async function listPublicQuestions(placeId?: string) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("questions")
    .select("id, place_id, question_type, body, credit_cost, created_at")
    .order("created_at", { ascending: false });

  if (placeId) {
    query = query.eq("place_id", placeId);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error, "QUESTIONS_FETCH_FAILED", "물어보기 목록을 불러오지 못했습니다.");
  }

  return ((data ?? []) as QuestionRow[]).map((question) => ({
    id: question.id,
    placeId: question.place_id,
    questionType: question.question_type,
    body: question.body,
    creditCost: question.credit_cost,
    createdAt: question.created_at,
  }));
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
