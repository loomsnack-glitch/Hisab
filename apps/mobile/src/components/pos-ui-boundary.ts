export const POS_BUTTON_VARIANTS = ["primary", "secondary", "destructive"] as const;
export type PosButtonVariant = (typeof POS_BUTTON_VARIANTS)[number];

export const POS_STATUS_TONES = ["neutral", "success", "warning", "danger"] as const;
export type PosStatusTone = (typeof POS_STATUS_TONES)[number];
