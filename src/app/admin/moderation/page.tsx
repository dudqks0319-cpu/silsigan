import { Flag, ShieldAlert } from "lucide-react";
import { getModerationQueue } from "@/lib/mock-store";

export default function ModerationPage() {
  const queue = getModerationQueue();

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
        {queue.length === 0 ? (
          <div className="admin-empty">검토 대기 중인 신고가 없습니다.</div>
        ) : (
          <div className="admin-list">
            {queue.map((item) => (
              <article className="admin-card" key={item.id}>
                <div>
                  <span>{item.status === "hidden" ? "임시 숨김" : "검토 필요"}</span>
                  <h2>{item.comment ?? "코멘트 없는 제보"}</h2>
                  <p>
                    장소 {item.placeId} · 신고 {item.flagCount}건 · {item.verifiedRadiusM}m 이내 현장 인증
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
