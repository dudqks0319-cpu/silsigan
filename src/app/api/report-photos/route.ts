import { fail, ok } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { sanitizePhotoUploadForStorage } from "@/lib/photo-validation";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSupabaseServiceClient,
  ensureProfile,
  getReportPhotoBucket,
  getRequiredUserId,
  throwSupabaseError,
} from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const userId = await getRequiredUserId(request);
    checkRateLimit({ action: "create_report", actorId: userId });
    await ensureProfile(userId);

    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      throw new ApiError(400, "PHOTO_REQUIRED", "업로드할 사진 파일이 필요합니다.");
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());
    const sanitized = await sanitizePhotoUploadForStorage({
      name: photo.name,
      mimeType: photo.type,
      sizeBytes: photo.size,
      bytes,
    });

    const supabase = createSupabaseServiceClient();
    const bucket = getReportPhotoBucket();
    const { error } = await supabase.storage.from(bucket).upload(sanitized.storagePath, sanitized.bytes!, {
      cacheControl: "31536000",
      contentType: sanitized.mimeType,
      upsert: false,
    });

    if (error) {
      throwSupabaseError(error, "PHOTO_UPLOAD_FAILED", "사진 저장에 실패했습니다.");
    }

    const { error: uploadRecordError } = await supabase.from("report_photo_uploads").insert({
      user_id: userId,
      bucket_name: bucket,
      photo_path: sanitized.storagePath,
      content_type: sanitized.mimeType,
      size_bytes: sanitized.sizeBytes,
    });

    if (uploadRecordError) {
      await supabase.storage.from(bucket).remove([sanitized.storagePath]);
      throwSupabaseError(uploadRecordError, "PHOTO_UPLOAD_RECORD_FAILED", "사진 업로드 기록 저장에 실패했습니다.");
    }

    return ok({
      photoPath: sanitized.storagePath,
      mimeType: sanitized.mimeType,
      sizeBytes: sanitized.sizeBytes,
      metadata: sanitized.metadata,
    });
  } catch (error) {
    return fail(error);
  }
}
