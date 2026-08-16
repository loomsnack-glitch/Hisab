import { Hono } from "hono";
import { z } from "zod";
import {
  AssignServiceTablesToAreaSchema,
  CreateServiceAreaSchema,
  CreateServiceTableSchema,
  STATUS_CODES,
  UpdateServiceAreaSchema,
  UpdateServiceTableSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as tableService from "./table-service.service";

const FILE_NAME = "table-service.routes";
const uuidSchema = z.uuid("Invalid id");
const router = new Hono<{ Variables: AppVariables }>();

const validateUuid = (value: string, message: string) => {
  const result = uuidSchema.safeParse(value);
  return result.success ? null : { status: "error" as const, message, code: STATUS_CODES.BAD_REQUEST };
};

const validateScope = (
  organizationId: string,
  storeId: string,
  resourceId?: string,
  resourceMessage = "Invalid id",
) =>
  validateUuid(organizationId, "Invalid organization id")
    ?? validateUuid(storeId, "Invalid store id")
    ?? (resourceId ? validateUuid(resourceId, resourceMessage) : null);

router.use("*", authMiddleware);

router.get("/:organizationId/stores/:storeId/tables", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const invalid = validateScope(organizationId, storeId);
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(c, await tableService.getServiceTables(c.get("authUser").id, organizationId, storeId));
  } catch (error) {
    return handleError(FILE_NAME, "getServiceTables", c, error);
  }
});

router.post(
  "/:organizationId/stores/:storeId/tables",
  validateSchema("json", CreateServiceTableSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const invalid = validateScope(organizationId, storeId);
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.createServiceTable(
        c.get("authUser").id,
        organizationId,
        storeId,
        c.req.valid("json"),
      ));
    } catch (error) {
      return handleError(FILE_NAME, "createServiceTable", c, error);
    }
  },
);

router.patch(
  "/:organizationId/stores/:storeId/tables/:tableId",
  validateSchema("json", UpdateServiceTableSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const tableId = c.req.param("tableId");
      const invalid = validateScope(organizationId, storeId, tableId, "Invalid table id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.updateServiceTable(
        c.get("authUser").id,
        organizationId,
        storeId,
        tableId,
        c.req.valid("json"),
      ));
    } catch (error) {
      return handleError(FILE_NAME, "updateServiceTable", c, error);
    }
  },
);

router.get("/:organizationId/stores/:storeId/areas", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const invalid = validateScope(organizationId, storeId);
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(c, await tableService.getServiceAreas(c.get("authUser").id, organizationId, storeId));
  } catch (error) {
    return handleError(FILE_NAME, "getServiceAreas", c, error);
  }
});

router.post(
  "/:organizationId/stores/:storeId/areas",
  validateSchema("json", CreateServiceAreaSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const invalid = validateScope(organizationId, storeId);
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.createServiceArea(
        c.get("authUser").id,
        organizationId,
        storeId,
        c.req.valid("json"),
      ));
    } catch (error) {
      return handleError(FILE_NAME, "createServiceArea", c, error);
    }
  },
);

router.patch(
  "/:organizationId/stores/:storeId/areas/:areaId",
  validateSchema("json", UpdateServiceAreaSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const areaId = c.req.param("areaId");
      const invalid = validateScope(organizationId, storeId, areaId, "Invalid area id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.updateServiceArea(
        c.get("authUser").id,
        organizationId,
        storeId,
        areaId,
        c.req.valid("json"),
      ));
    } catch (error) {
      return handleError(FILE_NAME, "updateServiceArea", c, error);
    }
  },
);

router.delete("/:organizationId/stores/:storeId/areas/:areaId", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const areaId = c.req.param("areaId");
    const invalid = validateScope(organizationId, storeId, areaId, "Invalid area id");
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(c, await tableService.deleteServiceArea(
      c.get("authUser").id,
      organizationId,
      storeId,
      areaId,
    ));
  } catch (error) {
    return handleError(FILE_NAME, "deleteServiceArea", c, error);
  }
});

router.post(
  "/:organizationId/stores/:storeId/areas/:areaId/tables",
  validateSchema("json", AssignServiceTablesToAreaSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const areaId = c.req.param("areaId");
      const invalid = validateScope(organizationId, storeId, areaId, "Invalid area id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.assignServiceTablesToArea(
        {
          userId: c.get("authUser").id,
          organizationId,
          storeId,
          areaId,
        },
        c.req.valid("json"),
      ));
    } catch (error) {
      return handleError(FILE_NAME, "assignServiceTablesToArea", c, error);
    }
  },
);

router.delete(
  "/:organizationId/stores/:storeId/areas/:areaId/tables/:tableId",
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const areaId = c.req.param("areaId");
      const tableId = c.req.param("tableId");
      const invalid = validateScope(organizationId, storeId, areaId, "Invalid area id")
        ?? validateUuid(tableId, "Invalid table id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(c, await tableService.unassignServiceTableFromArea(
        {
          userId: c.get("authUser").id,
          organizationId,
          storeId,
          areaId,
          tableId,
        },
      ));
    } catch (error) {
      return handleError(FILE_NAME, "unassignServiceTableFromArea", c, error);
    }
  },
);

export default router;
