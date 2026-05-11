import Link from "next/link";

export default function PhotoPolicyPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>사진 업로드 정책</h1>
        <p>얼굴, 차량번호, 접수번호, 서류, 진료정보, 결제정보가 보이는 사진은 올릴 수 없습니다.</p>
        <p>병원과 관공서는 내부 사진보다 외부, 입구, 주차장처럼 개인정보 위험이 낮은 사진만 권장합니다.</p>
        <p>신고로 숨김 처리된 제보의 사진은 삭제될 수 있으며, 복구하더라도 삭제된 사진은 돌아오지 않을 수 있습니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
