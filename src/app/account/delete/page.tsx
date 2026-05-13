import Link from "next/link";
import { AccountDeletionRequestForm } from "./AccountDeletionRequestForm";

export default function AccountDeletePage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>계정 삭제</h1>
        <p>앱 안에서 계정 삭제 요청을 시작하고 익명 계정과 관련 기록 처리 범위를 확인할 수 있습니다.</p>
        <AccountDeletionRequestForm />
        <p>법령상 보관이 필요한 신고 처리 기록은 필요한 기간 동안 분리 보관될 수 있습니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
