export const SERVICE_TABLE_VIEW_MODES = ["simple", "floor"] as const;

export type ServiceTableViewMode = (typeof SERVICE_TABLE_VIEW_MODES)[number];
export type ServiceTableViewScope = "admin" | "pos";

const SERVICE_TABLE_VIEW_STORAGE_KEYS: Record<ServiceTableViewScope, string> = {
  admin: "hisab_admin_service_table_view",
  pos: "hisab_pos_service_table_view",
};

export const DEFAULT_SERVICE_TABLE_VIEW: ServiceTableViewMode = "simple";

export const isServiceTableViewMode = (value: string): value is ServiceTableViewMode =>
  SERVICE_TABLE_VIEW_MODES.some((mode) => mode === value);

export const readServiceTableViewMode = (scope: ServiceTableViewScope): ServiceTableViewMode => {
  if (typeof window === "undefined") {
    return DEFAULT_SERVICE_TABLE_VIEW;
  }

  try {
    const stored = window.localStorage.getItem(SERVICE_TABLE_VIEW_STORAGE_KEYS[scope]);
    return stored && isServiceTableViewMode(stored) ? stored : DEFAULT_SERVICE_TABLE_VIEW;
  } catch {
    return DEFAULT_SERVICE_TABLE_VIEW;
  }
};

export const persistServiceTableViewMode = (
  scope: ServiceTableViewScope,
  mode: ServiceTableViewMode,
) => {
  try {
    window.localStorage.setItem(SERVICE_TABLE_VIEW_STORAGE_KEYS[scope], mode);
  } catch {
    // The setting still applies for the current session when storage is unavailable.
  }
};
