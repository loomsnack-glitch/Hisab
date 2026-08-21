import { useCallback, useLayoutEffect, useState, type ReactNode } from "react";

import {
    applyDisplayScale,
    type DisplayScale,
    type DisplayScaleScope,
    persistDisplayScale,
    readDisplayScale,
} from "@/lib/display-scale";
import { DisplayScaleContext } from "@/providers/display-scale-context";

type DisplayScaleProviderProps = {
    children: ReactNode;
    scope: DisplayScaleScope;
};

export const DisplayScaleProvider = ({ children, scope }: DisplayScaleProviderProps) => {
    const [scales, setScales] = useState<Record<DisplayScaleScope, DisplayScale>>(() => ({
        admin: readDisplayScale("admin"),
        pos: readDisplayScale("pos"),
    }));

    const scale = scales[scope];

    useLayoutEffect(() => {
        applyDisplayScale(scale);
    }, [scale]);

    const setScale = useCallback(
        (nextScale: DisplayScale) => {
            setScales((currentScales) => ({ ...currentScales, [scope]: nextScale }));
            persistDisplayScale(scope, nextScale);
        },
        [scope],
    );

    return (
        <DisplayScaleContext.Provider value={{ scale, setScale }}>
            {children}
        </DisplayScaleContext.Provider>
    );
};
