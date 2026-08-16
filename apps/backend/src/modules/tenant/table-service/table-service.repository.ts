import { pg } from "@/config/db";
import type {
  CreateServiceTableREPO,
  ServiceTableDTO,
  ServiceTablePosition,
  UpdateServiceTableREPO,
} from "@repo/types";

type Db = typeof pg | Bun.TransactionSQL;

const mapRow = (row: Record<string, unknown>): ServiceTableDTO => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  storeId: row.store_id as string,
  tableLabel: row.table_label as string,
  capacity: row.capacity === null || row.capacity === undefined ? null : Number(row.capacity),
  position: {
    x: Number(row.position_x),
    y: Number(row.position_y),
  },
  state: row.state as ServiceTableDTO["state"],
  currentSaleId: (row.current_sale_id as string | null | undefined) ?? null,
  createdBy: row.created_by as string,
  updatedBy: (row.updated_by as string | null | undefined) ?? null,
  createdAt: row.created_at as string | Date,
  updatedAt: row.updated_at as string | Date,
});

const selectColumns = `
  id, organization_id, store_id, table_label, capacity,
  position_x, position_y, state, current_sale_id,
  created_by, updated_by, created_at, updated_at
`;

export const getServiceTables = async (
  organizationId: string,
  storeId: string,
): Promise<ServiceTableDTO[]> => {
  const rows = await pg`
    SELECT ${pg.unsafe(selectColumns)}
    FROM service_tables
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
    ORDER BY position_y ASC, position_x ASC, created_at ASC, id ASC
  `;
  return rows.map((row: Record<string, unknown>) => mapRow(row));
};

export const getServiceTableById = async (
  organizationId: string,
  storeId: string,
  tableId: string,
): Promise<ServiceTableDTO | null> => {
  const [row] = await pg`
    SELECT ${pg.unsafe(selectColumns)}
    FROM service_tables
    WHERE id = ${tableId}
      AND organization_id = ${organizationId}
      AND store_id = ${storeId}
  `;
  return row ? mapRow(row) : null;
};

export const serviceTableLabelExists = async (
  storeId: string,
  tableLabel: string,
  excludeId?: string,
): Promise<boolean> => {
  const rows = excludeId
    ? await pg`
        SELECT 1 FROM service_tables
        WHERE store_id = ${storeId}
          AND lower(btrim(table_label)) = lower(btrim(${tableLabel}))
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await pg`
        SELECT 1 FROM service_tables
        WHERE store_id = ${storeId}
          AND lower(btrim(table_label)) = lower(btrim(${tableLabel}))
        LIMIT 1
      `;
  return Boolean(rows[0]);
};

export const createServiceTable = async (
  table: CreateServiceTableREPO,
  tx?: Bun.TransactionSQL,
): Promise<ServiceTableDTO | null> => {
  const db: Db = tx || pg;
  const [row] = await db`
    INSERT INTO service_tables (
      id, organization_id, store_id, table_label, capacity,
      position_x, position_y, created_by
    ) VALUES (
      ${table.id}, ${table.organizationId}, ${table.storeId}, ${table.tableLabel}, ${table.capacity},
      ${table.position.x}, ${table.position.y}, ${table.createdBy}
    )
    RETURNING ${db.unsafe(selectColumns)}
  `;
  return row ? mapRow(row) : null;
};

export const updateServiceTable = async (
  table: UpdateServiceTableREPO,
): Promise<ServiceTableDTO | null> => {
  const current = await getServiceTableById(table.organizationId, table.storeId, table.id);
  if (!current) return null;

  const nextLabel = table.tableLabel ?? current.tableLabel;
  const nextCapacity = table.capacity === undefined ? current.capacity : table.capacity;
  const nextPosition = table.position ?? current.position;
  const [row] = await pg`
    UPDATE service_tables
    SET table_label = ${nextLabel},
        capacity = ${nextCapacity},
        position_x = ${nextPosition.x},
        position_y = ${nextPosition.y},
        updated_by = ${table.updatedBy},
        updated_at = NOW()
    WHERE id = ${table.id}
      AND organization_id = ${table.organizationId}
      AND store_id = ${table.storeId}
    RETURNING ${pg.unsafe(selectColumns)}
  `;
  return row ? mapRow(row) : null;
};

export const normalizePosition = (position: ServiceTablePosition): ServiceTablePosition => ({
  x: Math.min(1, Math.max(0, position.x)),
  y: Math.min(1, Math.max(0, position.y)),
});
