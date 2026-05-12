import { assertAdminTokenHeader } from "../../../../lib/admin-auth.ts";
import { fail, ok } from "../../../../lib/api.ts";
import { ApiError } from "../../../../lib/errors.ts";
import { cleanupUnusedReportPhotos } from "../../../../lib/store.ts";

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  try {
    assertAdminTokenHeader(request);
    const before = parseBeforeParam(request);

    return ok(await cleanupUnusedReportPhotos(before), {
      policy: "24시간 이상 제보에 연결되지 않은 사진 업로드 파일과 기록을 삭제합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

function parseBeforeParam(request: Request) {
  const rawBefore = new URL(request.url).searchParams.get("before");

  if (!rawBefore) {
    return undefined;
  }

  const before = new Date(rawBefore);
  if (Number.isNaN(before.getTime())) {
    throw new ApiError(400, "INVALID_CLEANUP_BEFORE", "before 값은 ISO 날짜여야 합니다.");
  }

  return before;
}
