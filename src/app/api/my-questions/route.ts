import { fail, ok } from "@/lib/api";
import { actorIdFromRequest } from "@/lib/rate-limit";
import { listMyQuestions } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);

    return ok(await listMyQuestions({ actorId, request }), {
      privacy: "내 질문 목록은 요청한 사용자 본인에게만 제공됩니다.",
    });
  } catch (error) {
    return fail(error);
  }
}
