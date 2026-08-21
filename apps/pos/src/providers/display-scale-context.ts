import { createContext } from "react";

import type { DisplayScale } from "@/lib/display-scale";

export type DisplayScaleContextValue = {
    scale: DisplayScale;
    setScale: (scale: DisplayScale) => void;
};

export const DisplayScaleContext = createContext<DisplayScaleContextValue | null>(null);
