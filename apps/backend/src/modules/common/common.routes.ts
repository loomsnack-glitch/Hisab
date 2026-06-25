import { Hono } from "hono";
import { GetSignedURLForUploadSchema, GetSignedURLSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as commonService from "./common.service";

const FILE_NAME = "common.routes";

const router = new Hono<{ Variables: AppVariables }>();

router.use("*", authMiddleware);

router.get("/get-signed-url", validateSchema("query", GetSignedURLSchema), async (c) => {
    try {
        const { path } = c.req.valid("query");
        const serviceResponse = await commonService.getSignedURL(path);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSignedURL", c, error);
    }
});

router.get("/get-signed-url-for-upload", validateSchema("query", GetSignedURLForUploadSchema), async (c) => {
    try {
        const { path } = c.req.valid("query");
        const serviceResponse = await commonService.getSignedURLForUpload(path);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSignedURLForUpload", c, error);
    }
});

export default router;
