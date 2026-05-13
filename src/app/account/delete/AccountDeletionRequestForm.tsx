"use client";

import { useState } from "react";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
};

export function AccountDeletionRequestForm() {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("앱 안에서 삭제 요청을 시작할 수 있습니다.");
  const [submitting, setSubmitting] = useState(false);

  const requestDeletion = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      const headers = new Headers({
        "content-type": "application/json",
      });

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      const response = await fetch("/api/account-deletion", {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as ApiResponse<{ requestedAt: string; status: string }>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "계정 삭제 요청을 저장하지 못했습니다.");
      }

      setStatus("계정 삭제 요청이 접수되었습니다. 베타 운영자가 기록과 사진 처리 범위를 확인합니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "계정 삭제 요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="account-delete-request">
      <label>
        삭제 요청 사유
        <textarea
          maxLength={200}
          onChange={(event) => setReason(event.target.value)}
          placeholder="선택 입력: 사용 중단, 개인정보 삭제 요청 등"
          value={reason}
        />
      </label>
      <button disabled={submitting} onClick={requestDeletion} type="button">
        {submitting ? "요청 중..." : "계정 삭제 요청"}
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
