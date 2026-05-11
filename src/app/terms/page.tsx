import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>이용약관</h1>
        <p>#실시간은 장소의 현재 혼잡도, 줄, 주차, 사진 제보를 공유하는 웹 베타 서비스입니다.</p>
        <p>사용자는 허위 정보, 광고성 내용, 타인의 개인정보가 포함된 내용을 올릴 수 없습니다.</p>
        <p>제보는 운영 정책에 따라 숨김, 삭제, 신고 검토 대상이 될 수 있습니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
