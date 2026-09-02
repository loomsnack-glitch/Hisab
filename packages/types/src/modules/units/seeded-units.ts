export const PIECE_PREDEFINED_UNIT_KEY = "piece";

export type PredefinedUnitDefinition = {
  key: string;
  name: string;
  label: string;
};

export const SEEDED_UNITS = [
  { key: PIECE_PREDEFINED_UNIT_KEY, name: "piece", label: "pc" },
  { key: "packet", name: "packet", label: "pkt" },
  { key: "box", name: "box", label: "box" },
  { key: "carton", name: "carton", label: "ctn" },
  { key: "bag", name: "bag", label: "bag" },
  { key: "bottle", name: "bottle", label: "bottle" },
  { key: "can", name: "can", label: "can" },
  { key: "jar", name: "jar", label: "jar" },
  { key: "tray", name: "tray", label: "tray" },
  { key: "dozen", name: "dozen", label: "doz" },
  { key: "kilogram", name: "kilogram", label: "kg" },
  { key: "gram", name: "gram", label: "g" },
  { key: "litre", name: "litre", label: "L" },
  { key: "millilitre", name: "millilitre", label: "mL" },
  { key: "metre", name: "metre", label: "m" },
  { key: "foot", name: "foot", label: "ft" },
] as const satisfies readonly PredefinedUnitDefinition[];

export const PREDEFINED_UNITS = SEEDED_UNITS;
