import { z } from "zod";

const storagePathSchema = z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(512, "Path must be at most 512 characters");

export const GetSignedURLSchema = z.object({
    path: storagePathSchema,
});

export const GetSignedURLForUploadSchema = z.object({
    path: storagePathSchema,
});
