import Link from "next/link";

export default function LocationTermsPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>위치기반서비스 이용약관</h1>
        <p>현장 인증은 사용자가 선택한 장소 근처에 있는지 확인하기 위한 기능입니다.</p>
        <p>정확한 위도와 경도는 인증 계산에만 사용되며, 서비스 화면에는 50m, 150m, 300m 같은 반경 정보만 표시됩니다.</p>
        <p>위치 권한을 거부해도 인증 없는 제보는 가능하지만 보상 없이 낮은 신뢰도로 표시됩니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
