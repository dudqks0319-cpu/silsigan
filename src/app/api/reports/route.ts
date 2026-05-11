import { fail, ok } from "@/lib/api";
import { actorIdFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { createReport, listPublicReports } from "@/lib/store";
import { createReportSchema, listReportsSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = listReportsSchema.parse({
      placeId: url.searchParams.get("placeId") ?? undefined,
      includeExpired: url.searchParams.get("includeExpired") ?? undefined,
    });

    return ok(await listPublicReports(filters), {
      privacy: "정확한 내 위치는 보여주지 않고 현장 인증 여부만 표시합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "create_report", actorId });
    const input = createReportSchema.parse(await request.json());

    return ok(await createReport(input, { actorId, request }));
  } catch (error) {
    return fail(error);
  }
}
