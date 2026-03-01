import { z } from "zod";
import { ORGANIZATION_CONSTANTS } from "./organization.constant";

export const OrganizationDTOSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(ORGANIZATION_CONSTANTS.MAX_NAME_LENGTH),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateOrganizationDTOSchema = OrganizationDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateOrganizationDTOSchema = OrganizationDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
