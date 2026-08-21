import { useCallback, useEffect, useState } from "react";

const getFullscreenSupport = () =>
    typeof document !== "undefined"
    && typeof document.documentElement.requestFullscreen === "function"
    && typeof document.exitFullscreen === "function";

export const useFullscreen = () => {
    const [isFullscreen, setIsFullscreen] = useState(
        () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
    );
    const isSupported = getFullscreenSupport();

    useEffect(() => {
        if (!getFullscreenSupport()) {
            return;
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (!getFullscreenSupport()) {
            return false;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await document.documentElement.requestFullscreen();
        }

        return true;
    }, []);

    return { isFullscreen, isSupported, toggleFullscreen };
};
