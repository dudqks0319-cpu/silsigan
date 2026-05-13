import { assertAdminTokenHeader } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api";
import { handleAccountDeletionRequest, listAccountDeletionRequests } from "@/lib/store";
import { accountDeletionActionSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    assertAdminTokenHeader(request);

    return ok(await listAccountDeletionRequests(), {
      policy: "운영자 권한으로만 계정 삭제 요청 큐를 조회합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAdminTokenHeader(request);
    const input = accountDeletionActionSchema.parse(await request.json());

    return ok(await handleAccountDeletionRequest(input), {
      policy: "계정 삭제 요청 처리 상태와 운영자 메모를 저장합니다.",
    });
  } catch (error) {
    return fail(error);
  }
}
