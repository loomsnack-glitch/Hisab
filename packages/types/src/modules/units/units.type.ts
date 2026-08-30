import type { z } from "zod";
import type {
  CreateUnitSchema,
  UnitDTOSchema,
  UnitKindSchema,
  UnitStatusSchema,
  UpdateUnitSchema,
} from "./units.schema";

export type UnitStatus = z.infer<typeof UnitStatusSchema>;
export type UnitKind = z.infer<typeof UnitKindSchema>;
export type UnitDTO = z.infer<typeof UnitDTOSchema>;

export type CreateUnitJSON = z.infer<typeof CreateUnitSchema>;
export type CreateUnitSVC = CreateUnitJSON;
export type CreateUnitREPO = Pick<
  UnitDTO,
  | "id"
  | "organizationId"
  | "name"
  | "label"
  | "kind"
  | "predefinedKey"
  | "status"
  | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateUnitJSON = z.infer<typeof UpdateUnitSchema>;
export type UpdateUnitSVC = UpdateUnitJSON;
export type UpdateUnitREPO = Pick<
  UnitDTO,
  "id" | "organizationId" | "name" | "label" | "status" | "updatedBy"
>;

export type UnitsListResponse = {
  units: UnitDTO[];
};

export type UnitResponse = {
  unit: UnitDTO;
};
