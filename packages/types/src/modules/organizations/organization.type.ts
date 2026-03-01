import { z } from "zod";
import {
  OrganizationDTOSchema,
  CreateOrganizationDTOSchema,
  UpdateOrganizationDTOSchema,
} from "./organization.schema";

export type OrganizationDTO = z.infer<typeof OrganizationDTOSchema>;
export type CreateOrganizationDTO = z.infer<typeof CreateOrganizationDTOSchema>;
export type UpdateOrganizationDTO = z.infer<typeof UpdateOrganizationDTOSchema>;
