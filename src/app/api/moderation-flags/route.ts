import { assertAdminTokenHeader } from "../../../lib/admin-auth.ts";
import { fail, ok } from "../../../lib/api.ts";
import { flagReport, getModerationQueue } from "../../../lib/mock-store.ts";
import { actorIdFromRequest, checkRateLimit } from "../../../lib/rate-limit.ts";
import { flagReportSchema } from "../../../lib/validators.ts";

export async function GET(request: Request) {
  try {
    assertAdminTokenHeader(request);
    return ok(getModerationQueue(), {
      policy: "운영자 권한으로만 신고 큐를 조회합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "flag_report", actorId });
    const input = flagReportSchema.parse(await request.json());

    return ok(flagReport(input), {
      policy: "개인정보/민감정보 1건, 허위 2건, 전체 3건 이상이면 임시 숨김 처리합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}
