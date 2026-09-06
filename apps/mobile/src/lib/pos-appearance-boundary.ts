export const POS_THEMES = ["light", "dark", "system"] as const;
export type PosTheme = (typeof POS_THEMES)[number];

export const POS_DISPLAY_SIZES = ["standard", "large"] as const;
export type PosDisplaySize = (typeof POS_DISPLAY_SIZES)[number];

export const DEFAULT_POS_THEME: PosTheme = "system";
export const DEFAULT_POS_DISPLAY_SIZE: PosDisplaySize = "standard";

export const resolvePosTheme = (value: string | null): PosTheme =>
    POS_THEMES.includes(value as PosTheme) ? (value as PosTheme) : DEFAULT_POS_THEME;

export const resolvePosDisplaySize = (value: string | null): PosDisplaySize =>
    POS_DISPLAY_SIZES.includes(value as PosDisplaySize)
        ? (value as PosDisplaySize)
        : DEFAULT_POS_DISPLAY_SIZE;
