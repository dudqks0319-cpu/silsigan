import { ShieldAlert, Trash2 } from "lucide-react";
import { cookies } from "next/headers";
import { isAdminCookieAuthorized } from "@/lib/admin-auth";
import { listAccountDeletionRequests } from "@/lib/store";

const statusLabels = {
  pending: "처리 대기",
  processing: "처리 중",
  completed: "완료",
  rejected: "거절",
} as const;

export default async function AccountDeletionsPage() {
  const adminToken = process.env.ADMIN_MODERATION_TOKEN;
  const cookieStore = await cookies();
  const isAuthorized = isAdminCookieAuthorized(cookieStore.get("silsigan_admin_token")?.value, adminToken);
  const requests = isAuthorized ? await listAccountDeletionRequests() : [];

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-heading">
          <Trash2 size={28} />
          <div>
            <p>운영자 계정 삭제 요청 큐</p>
            <h1>#실시간 계정 삭제 요청 큐</h1>
          </div>
        </div>
        <p className="admin-warning">
          계정 삭제 요청은 처리 대기, 처리 중, 완료, 거절 상태로 관리합니다. 완료 전에는 신고/운영 기록 보존 범위를 확인하세요.
        </p>
        {!isAuthorized ? (
          <div className="admin-empty">운영자 인증 전에는 계정 삭제 요청 큐를 공개하지 않습니다.</div>
        ) : requests.length === 0 ? (
          <div className="admin-empty">처리 대기 중인 계정 삭제 요청이 없습니다.</div>
        ) : (
          <div className="admin-list">
            {requests.map((request) => (
              <article className="admin-card admin-card--account-deletion" key={request.id}>
                <div>
                  <span>{statusLabels[request.status]}</span>
                  <h2>{request.label}</h2>
                  <p>
                    요청 {formatDate(request.requestedAt)} · 처리{" "}
                    {request.processedAt ? formatDate(request.processedAt) : "미완료"}
                  </p>
                  <p>{request.reason || "사유 없음"}</p>
                  {request.operatorNote && <p>운영 메모: {request.operatorNote}</p>}
                </div>
                <ShieldAlert size={22} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
