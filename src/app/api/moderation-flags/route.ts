import { fail, ok } from "@/lib/api";
import { flagReport, getModerationQueue } from "@/lib/mock-store";
import { actorIdFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { flagReportSchema } from "@/lib/validators";

export async function GET() {
  try {
    return ok(getModerationQueue(), {
      policy: "운영 전 관리자 화면의 신고 큐 초안입니다. 실제 배포 전 관리자 인증을 붙여야 합니다."
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
      policy: "개인정보/민감정보 1건, 허위 2건, 전체 3건 이상이면 임시 숨김 처리합니다."
    });
  } catch (error) {
    return fail(error);
  }
}
