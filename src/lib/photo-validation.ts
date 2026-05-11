import { ApiError } from "./errors.ts";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 8 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 24_000_000;

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

export type SanitizedPhotoUpload = {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  bytes?: Uint8Array;
  metadata: {
    exifRemoved: true;
    originalFilenameRemoved: true;
    gpsRemoved: true;
    reencoded: boolean;
  };
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
      reencoded: false,
    },
  };
}

export async function sanitizePhotoUploadForStorage(candidate: PhotoUploadCandidate): Promise<SanitizedPhotoUpload> {
  validatePhotoUpload(candidate);

  if (!candidate.bytes) {
    throw new ApiError(400, "PHOTO_BYTES_REQUIRED", "사진 파일 본문이 필요합니다.");
  }

  const sharp = (await import("sharp")).default;
  const reencoded = await sharp(candidate.bytes, { limitInputPixels: MAX_PHOTO_PIXELS })
    .rotate()
    .jpeg({
      mozjpeg: true,
      quality: 82,
    })
    .toBuffer();

  return {
    storagePath: `reports/${crypto.randomUUID()}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: reencoded.byteLength,
    bytes: new Uint8Array(reencoded),
    metadata: {
      exifRemoved: true,
      originalFilenameRemoved: true,
      gpsRemoved: true,
      reencoded: true,
    },
  };
}

export function validateStoredPhotoPath(photoPath: string) {
  if (!/^reports\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i.test(photoPath)) {
    throw new ApiError(400, "INVALID_PHOTO_PATH", "사진 저장 경로가 올바르지 않습니다.");
  }
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
