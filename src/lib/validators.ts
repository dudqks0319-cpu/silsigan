import { z } from "zod";
import {
  crowdLevels,
  flagReasons,
  lineStatuses,
  parkingStatuses,
  questionTypes,
  reportCategories,
  weatherFeels,
} from "./domain.ts";

export const coordinateSchema = z.object({
  latitude: z.number().min(33).max(39),
  longitude: z.number().min(124).max(132),
});

export const createReportSchema = z.object({
  placeId: z.string().min(1).max(80),
  category: z.enum(reportCategories),
  crowdLevel: z.enum(crowdLevels),
  lineStatus: z.enum(lineStatuses),
  parkingStatus: z.enum(parkingStatuses),
  weatherFeel: z.enum(weatherFeels),
  comment: z.string().trim().max(120).optional(),
  photoUrl: z.string().url().max(2_048).optional(),
  photoPath: z.string().trim().regex(/^reports\/[0-9a-f-]+\.jpg$/i).max(512).optional(),
  photoName: z.string().trim().max(160).optional(),
  photoMime: z.string().trim().max(80).optional(),
  photoSizeBytes: z.number().int().min(0).max(8 * 1024 * 1024).optional(),
  clientLocation: coordinateSchema.optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const listReportsSchema = z.object({
  placeId: z.string().min(1).max(80).optional(),
  includeExpired: z.coerce.boolean().optional().default(false),
});

export const createQuestionSchema = z.object({
  placeId: z.string().min(1).max(80),
  questionType: z.enum(questionTypes),
  body: z.string().trim().min(4).max(160),
  availableCredits: z.number().int().min(0).max(999).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const flagReportSchema = z.object({
  reportId: z.string().min(1).max(80),
  reason: z.enum(flagReasons),
  note: z.string().trim().max(200).optional(),
});

export type FlagReportInput = z.infer<typeof flagReportSchema>;

export const moderationActionSchema = z.object({
  reportId: z.string().min(1).max(80),
  action: z.enum(["hide", "restore"]),
  reason: z.string().trim().max(120).optional(),
  handledBy: z.string().uuid().optional(),
});

export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
