import { useEffect, useRef, type RefObject } from "react";

import {
    consumeDirectBarcodeScanKey,
    isEditableFocusTarget,
    shouldCaptureDirectBarcodeScan,
} from "@/lib/barcode-scanning";

export function useDirectBarcodeScanCapture({
    enabled,
    scanFieldRef,
    onScan,
}: {
    enabled: boolean;
    scanFieldRef: RefObject<HTMLElement | null>;
    onScan: (productCode: string) => void;
}) {
    const bufferRef = useRef("");

    useEffect(() => {
        if (!enabled) {
            bufferRef.current = "";
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const scanFieldOwnsFocus = activeElement === scanFieldRef.current;
            const dialogOwnsFocus = Boolean(document.querySelector('[role="dialog"]'));
            const canCapture = shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus,
                unrelatedEditableFieldOwnsFocus: isEditableFocusTarget(activeElement),
                dialogOwnsFocus,
            });

            if (!canCapture) {
                bufferRef.current = "";
                return;
            }

            if (event.key === "Enter") {
                const result = consumeDirectBarcodeScanKey(bufferRef.current, event.key);
                bufferRef.current = result.buffer;
                if (result.scannedCode) {
                    event.preventDefault();
                    onScan(result.scannedCode);
                }
                return;
            }

            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                bufferRef.current = consumeDirectBarcodeScanKey(bufferRef.current, event.key).buffer;
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => {
            bufferRef.current = "";
            window.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [enabled, onScan, scanFieldRef]);
}
