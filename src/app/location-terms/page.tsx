import Link from "next/link";

export default function LocationTermsPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>위치기반서비스 이용약관</h1>
        <h2>위치정보 이용 목적</h2>
        <p>현장 인증은 사용자가 선택한 장소 근처에 있는지 확인하고, 인증된 제보와 답변에 신뢰도를 부여하기 위한 기능입니다.</p>
        <h2>처리 방식</h2>
        <p>정확한 위도와 경도는 인증 계산에만 사용되며, 정확한 좌표는 저장하지 않습니다. 서비스 화면에는 50m, 150m, 300m 같은 반경 정보만 표시됩니다.</p>
        <h2>동의 거부와 철회</h2>
        <p>위치 권한을 거부해도 인증 없는 제보는 가능하지만 보상 없이 낮은 신뢰도로 표시됩니다.</p>
        <p>브라우저나 기기 설정에서 언제든지 위치 권한을 철회할 수 있습니다.</p>
        <h2>보관 기간</h2>
        <p>현장 인증 결과는 제보 신뢰도 표시와 물어보기권 지급 확인에 필요한 기간 동안 보관합니다.</p>
        <h2>문의 이메일</h2>
        <p>위치기반서비스 관련 문의는 contact@silsigan.app 으로 보내 주세요.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
