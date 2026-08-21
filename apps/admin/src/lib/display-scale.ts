export const DISPLAY_SCALE_OPTIONS = [
    { value: "small", label: "Small", percentage: 90 },
    { value: "default", label: "Default", percentage: 100 },
    { value: "large", label: "Large", percentage: 115 },
    { value: "extra-large", label: "Extra large", percentage: 125 },
    { value: "maximum", label: "Maximum", percentage: 150 },
] as const;

export type DisplayScale = (typeof DISPLAY_SCALE_OPTIONS)[number]["value"];
export type DisplayScaleScope = "admin" | "pos";

const DISPLAY_SCALE_STORAGE_KEYS: Record<DisplayScaleScope, string> = {
    admin: "hisab_admin_display_scale",
    pos: "hisab_pos_display_scale",
};

const DEFAULT_DISPLAY_SCALE: DisplayScale = "default";

export const isDisplayScale = (value: string): value is DisplayScale =>
    DISPLAY_SCALE_OPTIONS.some((option) => option.value === value);

export const readDisplayScale = (scope: DisplayScaleScope): DisplayScale => {
    if (typeof window === "undefined") {
        return DEFAULT_DISPLAY_SCALE;
    }

    try {
        const storedScale = window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEYS[scope]);
        return storedScale && isDisplayScale(storedScale) ? storedScale : DEFAULT_DISPLAY_SCALE;
    } catch {
        return DEFAULT_DISPLAY_SCALE;
    }
};

export const persistDisplayScale = (scope: DisplayScaleScope, scale: DisplayScale) => {
    try {
        window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEYS[scope], scale);
    } catch {
        // The setting still applies for the current session when storage is unavailable.
    }
};

export const getDisplayScaleOption = (scale: DisplayScale) =>
    DISPLAY_SCALE_OPTIONS.find((option) => option.value === scale) ?? DISPLAY_SCALE_OPTIONS[1];

export const applyDisplayScale = (scale: DisplayScale) => {
    const option = getDisplayScaleOption(scale);
    const root = document.documentElement;

    root.dataset.displayScale = scale;
    root.style.setProperty("--hisab-display-scale", `${option.percentage}%`);
};
