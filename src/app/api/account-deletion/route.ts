import { fail, ok } from "@/lib/api";
import { actorIdFromRequest, checkRateLimit } from "@/lib/rate-limit";
import { requestAccountDeletion } from "@/lib/store";
import { accountDeletionRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const actorId = actorIdFromRequest(request);
    checkRateLimit({ action: "request_account_deletion", actorId });
    const input = accountDeletionRequestSchema.parse(await request.json().catch(() => ({})));

    return ok(await requestAccountDeletion(input, { actorId, request }));
  } catch (error) {
    return fail(error);
  }
}
