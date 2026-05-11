import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section>
        <p className="eyebrow">#실시간 베타</p>
        <h1>개인정보 처리방침</h1>
        <p>#실시간은 현장 인증을 위해 일시적으로 위치를 확인하지만 정확한 좌표를 공개하거나 저장하지 않습니다.</p>
        <p>사진은 서버에서 재인코딩하며 원본 파일명, EXIF, GPS 정보가 저장되지 않도록 처리합니다.</p>
        <p>신고와 운영 처리는 서비스 안전을 위해 필요한 범위에서 기록됩니다.</p>
        <Link href="/">앱으로 돌아가기</Link>
      </section>
    </main>
  );
}
