import type z from "zod";
import type { GetSignedURLForUploadSchema, GetSignedURLSchema } from "./common.schema";

export type GetSignedURLJSON = z.infer<typeof GetSignedURLSchema>;
export type GetSignedURLForUploadJSON = z.infer<typeof GetSignedURLForUploadSchema>;
