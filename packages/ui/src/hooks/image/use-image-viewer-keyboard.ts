import { useEffect } from 'react';

interface UseImageViewerKeyboardProps {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    onClose?: () => void;
    onFullscreen?: () => void;
    onReset?: () => void;
    enabled?: boolean;
}

export function useImageViewerKeyboard({
    onZoomIn,
    onZoomOut,
    onRotateLeft,
    onRotateRight,
    onClose,
    onFullscreen,
    onReset,
    enabled = true,
}: UseImageViewerKeyboardProps) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Prevent default behavior for our shortcuts
            const shouldPreventDefault = () => {
                event.preventDefault();
                event.stopPropagation();
            };

            // Alt + key combinations for rotation to avoid conflicts
            if (event.altKey) {
                switch (event.key) {
                    case 'ArrowLeft':
                    case 'l':
                    case 'L':
                        shouldPreventDefault();
                        onRotateLeft?.();
                        break;
                    case 'ArrowRight':
                    case 'r':
                    case 'R':
                        shouldPreventDefault();
                        onRotateRight?.();
                        break;
                }
                return;
            }

            // Ctrl/Cmd + key combinations
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case '+':
                    case '=':
                        shouldPreventDefault();
                        onZoomIn?.();
                        break;
                    case '-':
                        shouldPreventDefault();
                        onZoomOut?.();
                        break;
                    case '0':
                        shouldPreventDefault();
                        onReset?.();
                        break;
                }
                return;
            }

            // Single key shortcuts
            switch (event.key) {
                case 'Escape':
                    onClose?.();
                    break;
                case 'f':
                case 'F':
                    shouldPreventDefault();
                    onFullscreen?.();
                    break;
                case '+':
                    shouldPreventDefault();
                    onZoomIn?.();
                    break;
                case '-':
                    shouldPreventDefault();
                    onZoomOut?.();
                    break;
                case 'r':
                case 'R':
                    shouldPreventDefault();
                    onReset?.();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        enabled,
        onZoomIn,
        onZoomOut,
        onRotateLeft,
        onRotateRight,
        onClose,
        onFullscreen,
        onReset,
    ]);
} 