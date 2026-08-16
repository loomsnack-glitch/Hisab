import type z from "zod";
import type {
  CreateServiceTableSchema,
  ServiceTableDTOSchema,
  UpdateServiceTableSchema,
} from "./table-service.schema";
import type { SaleDetailDTO } from "../billing";

export type ServiceTableDTO = z.infer<typeof ServiceTableDTOSchema>;
export type ServiceTableState = ServiceTableDTO["state"];
export type ServiceTablePosition = ServiceTableDTO["position"];

export type CreateServiceTableJSON = z.infer<typeof CreateServiceTableSchema>;
export type CreateServiceTableSVC = CreateServiceTableJSON;
export type UpdateServiceTableJSON = z.infer<typeof UpdateServiceTableSchema>;
export type UpdateServiceTableSVC = UpdateServiceTableJSON;

export type CreateServiceTableREPO = Pick<
  ServiceTableDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "tableLabel"
  | "capacity"
  | "position"
  | "createdBy"
>;

export type UpdateServiceTableREPO = Pick<
  ServiceTableDTO,
  "id" | "organizationId" | "storeId"
> & {
  tableLabel?: string;
  capacity?: number | null;
  position?: ServiceTablePosition;
  updatedBy: string;
};

export type ServiceTablesListResponse = {
  tables: ServiceTableDTO[];
};

export type ServiceTableResponse = {
  table: ServiceTableDTO;
};

export type ServiceTableSaleResponse = {
  table: ServiceTableDTO;
  sale: SaleDetailDTO;
};
