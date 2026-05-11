import { Flag, ShieldAlert } from "lucide-react";
import { cookies } from "next/headers";
import { isAdminCookieAuthorized } from "@/lib/admin-auth";
import { getModerationQueue } from "@/lib/store";

export default async function ModerationPage() {
  const adminToken = process.env.ADMIN_MODERATION_TOKEN;
  const cookieStore = await cookies();
  const isAuthorized = isAdminCookieAuthorized(cookieStore.get("silsigan_admin_token")?.value, adminToken);
  const queue = isAuthorized ? await getModerationQueue() : [];

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-heading">
          <ShieldAlert size={28} />
          <div>
            <p>운영자 신고 큐 초안</p>
            <h1>#실시간 신고/숨김 관리</h1>
          </div>
        </div>
        <p className="admin-warning">
          실제 운영 전에는 담당자 로그인, 처리 기록, 삭제 기준, 사진 삭제 절차를 연결해야 합니다.
        </p>
        {!isAuthorized ? (
          <div className="admin-empty">운영자 인증 전에는 신고 큐를 공개하지 않습니다.</div>
        ) : queue.length === 0 ? (
          <div className="admin-empty">검토 대기 중인 신고가 없습니다.</div>
        ) : (
          <div className="admin-list">
            {queue.map((item) => (
              <article className="admin-card" key={item.id}>
                <div>
                  <span>{item.status === "hidden" ? "임시 숨김" : "검토 필요"}</span>
                  <h2>{item.comment ?? "코멘트 없는 제보"}</h2>
                  <p>
                    장소 {item.placeId} · 신고 {item.flagCount}건 ·{" "}
                    {item.verifiedRadiusM ? `${item.verifiedRadiusM}m 이내 현장 인증` : "현장 인증 없음"}
                  </p>
                </div>
                <Flag size={22} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
