import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// True only for real calendar dates, so values like 2026-02-30 are rejected.
export function isRealCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

export const dateStringSchema = z.string().refine(isRealCalendarDate, {
  message: "Date must be a real calendar date in YYYY-MM-DD format.",
});

export const coordSchema = z.object({
  latitude: z.number().min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90."),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
});

// Same as coordSchema but for string query params.
// Accepts both ?latitude=&longitude= and the shorter ?lat=&lon= aliases.
export const coordQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

/** Normalize query params so ?lat=&lon= aliases also satisfy coordQuerySchema. */
export function normalizeCoordParams(
  params: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const out = { ...params };
  if (out.latitude === undefined && out.lat !== undefined) out.latitude = out.lat;
  if (out.longitude === undefined && out.lon !== undefined) out.longitude = out.lon;
  return out;
}

export function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const ms =
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) +
    days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export type DateRangeCheck = { ok: true } | { ok: false; message: string };

// Open-Meteo archive covers the past 92 days and forecasts 16 days ahead.
export function validateDateRange(start: string, end: string): DateRangeCheck {
  if (!isRealCalendarDate(start) || !isRealCalendarDate(end)) {
    return { ok: false, message: "Dates must be real calendar dates in YYYY-MM-DD format." };
  }
  if (start > end) {
    return { ok: false, message: "Start date must be on or before the end date." };
  }
  const min = addDays(todayUtcString(), -92);
  const max = addDays(todayUtcString(), 16);
  if (start < min || end > max) {
    return {
      ok: false,
      message: `Date range must fall between ${min} and ${max} (the past 92 days to the next 16 days).`,
    };
  }
  return { ok: true };
}

export const dateRangeSchema = z
  .object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .superRefine((v, ctx) => {
    const check = validateDateRange(v.startDate, v.endDate);
    if (!check.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.message });
    }
  });

const locationInputSchema = z.union([
  coordSchema,
  z.object({ query: z.string().trim().min(2, "Search text needs at least 2 characters.").max(100) }),
]);

export const createRequestSchema = z
  .object({
    location: locationInputSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    label: z.string().trim().max(120, "Label is limited to 120 characters.").optional(),
    notes: z.string().trim().max(2000, "Notes are limited to 2000 characters.").optional(),
  })
  .superRefine((v, ctx) => {
    const check = validateDateRange(v.startDate, v.endDate);
    if (!check.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.message });
    }
  });

export const updateRequestSchema = z
  .object({
    label: z.string().trim().max(120, "Label is limited to 120 characters.").nullable().optional(),
    notes: z.string().trim().max(2000, "Notes are limited to 2000 characters.").nullable().optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    isFavorite: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate) {
      const check = validateDateRange(v.startDate, v.endDate);
      if (!check.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.message });
      }
    }
  });

export const listQuerySchema = z.object({
  location: z.string().trim().max(100).optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  favorite: z.enum(["true", "false"]).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
