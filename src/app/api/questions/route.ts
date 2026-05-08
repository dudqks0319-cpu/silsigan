import { fail, ok } from "@/lib/api";
import { createQuestion, listPublicQuestions } from "@/lib/mock-store";
import { actorIdFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { createQuestionSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId") ?? undefined;

    return ok(listPublicQuestions(placeId), {
      privacy: "질문 목록은 장소 기준으로 제공되며 사용자 위치를 포함하지 않습니다."
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "create_question", actorId });
    const input = createQuestionSchema.parse(await request.json());

    return ok(createQuestion(input, { actorId }));
  } catch (error) {
    return fail(error);
  }
}
