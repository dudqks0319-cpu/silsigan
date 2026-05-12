"use client";

import { useEffect } from "react";

export function ShareOpenApp({ href }: { href: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(href);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [href]);

  return (
    <a className="share-open-app-button" href={href}>
      출발 전 확인하기
    </a>
  );
}
