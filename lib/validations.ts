import { z } from "zod";

export const AgentJobSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt is too long"),
  userId: z.string().uuid("Invalid user ID format"),
  imageUrl: z.string().url("Invalid image URL format").optional().or(z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, "Invalid base64 image format").optional()),
});

export const CheckoutSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  tier: z.enum(["Starter", "PRO", "Enterprise"], {
    errorMap: () => ({ message: "Invalid subscription tier" }),
  }),
});

export const TranscriptionSchema = z.object({
  file: z.instanceof(Blob, { message: "Invalid audio file format" }),
});
