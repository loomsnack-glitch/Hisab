import { beforeEach, describe, expect, test } from "bun:test";
import { A4_SHEET_LABEL_TEMPLATE, THERMAL_ROLL_LABEL_TEMPLATE } from "@repo/types";
import {
  a4LabelTemplate,
  catalogService,
  createLabelTemplateRepo,
  deleteLabelTemplateRepo,
  getLabelTemplateById,
  getLabelTemplatesByOrganizationId,
  getOrganizationByIdForUser,
  labelTemplateId,
  labelTemplateNameExistsInOrganization,
  organization,
  organizationId,
  seedDefaultLabelTemplatesRepo,
  thermalLabelTemplate,
  updateLabelTemplateRepo,
  userId,
} from "./catalog.service.test-harness";

describe("Label Template catalog service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getLabelTemplatesByOrganizationId.mockClear();
    getLabelTemplateById.mockClear();
    labelTemplateNameExistsInOrganization.mockClear();
    createLabelTemplateRepo.mockClear();
    updateLabelTemplateRepo.mockClear();
    deleteLabelTemplateRepo.mockClear();
    seedDefaultLabelTemplatesRepo.mockClear();

    getOrganizationByIdForUser.mockResolvedValue(organization);
    getLabelTemplatesByOrganizationId.mockResolvedValue([
      a4LabelTemplate,
      thermalLabelTemplate,
    ]);
    getLabelTemplateById.mockResolvedValue(a4LabelTemplate);
    labelTemplateNameExistsInOrganization.mockResolvedValue(false);
    createLabelTemplateRepo.mockImplementation(async (data) => ({
      ...a4LabelTemplate,
      ...data,
    }));
    updateLabelTemplateRepo.mockImplementation(async (data) => ({
      ...a4LabelTemplate,
      ...data,
    }));
    deleteLabelTemplateRepo.mockResolvedValue(a4LabelTemplate);
    seedDefaultLabelTemplatesRepo.mockResolvedValue([
      a4LabelTemplate,
      thermalLabelTemplate,
    ]);
  });

  test("creates an Organization-owned Label Template", async () => {
    const response = await catalogService.createLabelTemplate(
      userId,
      organizationId,
      A4_SHEET_LABEL_TEMPLATE,
    );

    expect(response.status).toBe("success");
    expect(response.data?.labelTemplate.name).toBe("A4 sheet (3 × 8 labels)");
    expect(response.data?.labelTemplate.organizationId).toBe(organizationId);
    expect(response.data?.labelTemplate.stock.media).toBe("sheet");
    expect(createLabelTemplateRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        name: "A4 sheet (3 × 8 labels)",
        createdBy: userId,
      }),
    );
  });

  test("lists Label Templates that belong only to the administrator's Organization", async () => {
    const response = await catalogService.getLabelTemplates(
      userId,
      organizationId,
    );

    expect(response.status).toBe("success");
    expect(response.data?.labelTemplates).toHaveLength(2);
    expect(response.data?.labelTemplates.map((template) => template.name)).toEqual([
      "A4 sheet (3 × 8 labels)",
      "Thermal label (58 × 40 mm)",
    ]);
    expect(getLabelTemplatesByOrganizationId).toHaveBeenCalledWith(organizationId);
  });

  test("another Organization cannot list or create Label Templates", async () => {
    getOrganizationByIdForUser.mockResolvedValue(null);

    const listed = await catalogService.getLabelTemplates(
      userId,
      organizationId,
    );
    const created = await catalogService.createLabelTemplate(
      userId,
      organizationId,
      THERMAL_ROLL_LABEL_TEMPLATE,
    );

    expect(listed.status).toBe("error");
    expect(listed.code).toBe(404);
    expect(created.status).toBe("error");
    expect(created.code).toBe(404);
    expect(getLabelTemplatesByOrganizationId).not.toHaveBeenCalled();
    expect(createLabelTemplateRepo).not.toHaveBeenCalled();
  });

  test("deactivates a Label Template without changing another Organization's records", async () => {
    const response = await catalogService.updateLabelTemplate(
      userId,
      organizationId,
      labelTemplateId,
      { status: "inactive" },
    );

    expect(response.status).toBe("success");
    expect(response.data?.labelTemplate.status).toBe("inactive");
    expect(updateLabelTemplateRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: labelTemplateId,
        organizationId,
        status: "inactive",
        updatedBy: userId,
      }),
    );
  });

  test("another Organization cannot update or delete a Label Template", async () => {
    getOrganizationByIdForUser.mockResolvedValue(null);

    const updated = await catalogService.updateLabelTemplate(
      userId,
      organizationId,
      labelTemplateId,
      { name: "Stolen design" },
    );
    const deleted = await catalogService.deleteLabelTemplate(
      userId,
      organizationId,
      labelTemplateId,
    );

    expect(updated.status).toBe("error");
    expect(updated.code).toBe(404);
    expect(deleted.status).toBe("error");
    expect(deleted.code).toBe(404);
    expect(updateLabelTemplateRepo).not.toHaveBeenCalled();
    expect(deleteLabelTemplateRepo).not.toHaveBeenCalled();
  });

  test("deletes a Label Template that belongs to the Organization", async () => {
    const response = await catalogService.deleteLabelTemplate(
      userId,
      organizationId,
      labelTemplateId,
    );

    expect(response.status).toBe("success");
    expect(response.data?.labelTemplate.id).toBe(labelTemplateId);
    expect(deleteLabelTemplateRepo).toHaveBeenCalledWith(
      organizationId,
      labelTemplateId,
    );
  });

  test("seeds A4 sheet and 58×40 mm thermal Label Templates for an Organization", async () => {
    getLabelTemplatesByOrganizationId.mockResolvedValue([]);

    const response = await catalogService.seedDefaultLabelTemplates(
      userId,
      organizationId,
    );

    expect(response.status).toBe("success");
    expect(response.data?.labelTemplates).toHaveLength(2);
    expect(seedDefaultLabelTemplatesRepo).toHaveBeenCalledWith(
      organizationId,
      userId,
    );
  });

  test("does not expose Label Template writes for Store Devices", () => {
    expect("createLabelTemplateForDevice" in catalogService).toBe(false);
    expect("updateLabelTemplateForDevice" in catalogService).toBe(false);
    expect("deleteLabelTemplateForDevice" in catalogService).toBe(false);
    expect("getLabelTemplatesForDevice" in catalogService).toBe(false);
  });

  test("rejects updating Keep-Outs that intersect existing Label Elements", async () => {
    const response = await catalogService.updateLabelTemplate(
      userId,
      organizationId,
      labelTemplateId,
      {
        keepOuts: [{ xMm: 0, yMm: 0, widthMm: 70, heightMm: 12 }],
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(400);
    expect(response.message).toBe("Label Element intersects a Keep-Out");
    expect(updateLabelTemplateRepo).not.toHaveBeenCalled();
  });
});
