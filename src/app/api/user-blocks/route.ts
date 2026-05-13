import { fail, ok } from "@/lib/api";
import { actorIdFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { blockReportAuthor, listUserBlocks, unblockUser } from "@/lib/store";
import { blockReportAuthorSchema, unblockUserSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);

    return ok(await listUserBlocks({ actorId, request }), {
      policy: "차단한 사용자의 제보와 질문은 내 화면에서 숨깁니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "block_user", actorId });
    const input = blockReportAuthorSchema.parse(await request.json());

    return ok(await blockReportAuthor(input, { actorId, request }), {
      policy: "신고 후 원치 않는 작성자의 제보와 질문을 숨길 수 있습니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "unblock_user", actorId });
    const input = unblockUserSchema.parse(await request.json());

    return ok(await unblockUser(input, { actorId, request }), {
      policy: "차단 해제 후 다음 새로고침부터 해당 사용자의 공개 제보와 질문이 다시 보일 수 있습니다.",
    });
  } catch (error) {
    return fail(error);
  }
}
