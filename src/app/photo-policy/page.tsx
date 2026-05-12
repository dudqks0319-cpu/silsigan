import Link from "next/link";

export default function PhotoPolicyPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>사진 업로드 정책</h1>
        <h2>업로드 금지</h2>
        <p>얼굴, 차량번호, 접수번호, 서류, 진료정보, 결제정보가 보이는 사진은 올릴 수 없습니다.</p>
        <h2>병원/관공서 기준</h2>
        <p>병원 내부, 접수번호, 이름표, 진료정보, 민원 서류가 보이는 사진은 올릴 수 없습니다.</p>
        <p>병원과 관공서는 내부 사진보다 외부, 입구, 주차장처럼 개인정보 위험이 낮은 사진만 권장합니다.</p>
        <h2>처리 방식</h2>
        <p>업로드 사진은 JPEG로 재인코딩하며 원본 파일명과 EXIF/GPS 위치정보를 저장하지 않도록 처리합니다.</p>
        <h2>사진 삭제 요청</h2>
        <p>본인 또는 타인의 개인정보가 포함된 사진은 신고하거나 contact@silsigan.app 으로 사진 삭제 요청을 보낼 수 있습니다.</p>
        <h2>신고 처리</h2>
        <p>신고로 숨김 처리된 제보의 사진은 삭제될 수 있으며, 복구하더라도 삭제된 사진은 돌아오지 않을 수 있습니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
