import { useContext } from "react";

import { DisplayScaleContext } from "@/providers/display-scale-context";

export const useDisplayScale = () => {
    const context = useContext(DisplayScaleContext);

    if (!context) {
        throw new Error("useDisplayScale must be used inside DisplayScaleProvider");
    }

    return context;
};
