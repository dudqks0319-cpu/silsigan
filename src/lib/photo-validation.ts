import { ApiError } from "./errors.ts";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 8 * 1024 * 1024;

const magicBytes: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

export type PhotoUploadCandidate = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  bytes?: Uint8Array;
};

export function validatePhotoUpload(candidate: PhotoUploadCandidate) {
  if (!allowedMimeTypes.has(candidate.mimeType)) {
    throw new ApiError(415, "UNSUPPORTED_PHOTO_TYPE", "JPG, PNG, WebP 사진만 업로드할 수 있습니다.");
  }

  if (candidate.sizeBytes > maxPhotoBytes) {
    throw new ApiError(413, "PHOTO_TOO_LARGE", "사진은 8MB 이하만 업로드할 수 있습니다.", {
      maxPhotoBytes,
    });
  }

  if (candidate.bytes && !matchesMagicBytes(candidate.mimeType, candidate.bytes)) {
    throw new ApiError(415, "PHOTO_SIGNATURE_MISMATCH", "사진 파일 형식이 확장자 또는 MIME 타입과 일치하지 않습니다.");
  }
}

export function sanitizePhotoUpload(candidate: PhotoUploadCandidate) {
  validatePhotoUpload(candidate);

  const extension = extensionForMime(candidate.mimeType);

  return {
    storagePath: `reports/${crypto.randomUUID()}.${extension}`,
    mimeType: candidate.mimeType,
    sizeBytes: candidate.sizeBytes,
    metadata: {
      exifRemoved: true,
      originalFilenameRemoved: true,
      gpsRemoved: true,
    },
  };
}

function matchesMagicBytes(mimeType: string, bytes: Uint8Array) {
  const signatures = magicBytes[mimeType] ?? [];

  return signatures.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}
