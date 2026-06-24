import { useState, useCallback, useRef, useEffect, type WheelEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGesture } from '@use-gesture/react';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Download, X, Maximize, Minimize, ListRestart } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { useImageLoader } from '@repo/ui/hooks/image/use-image-loader';
import { useImageViewerKeyboard } from '@repo/ui/hooks/image/use-image-viewer-keyboard';
import { Button } from '@repo/ui/components/button';
import Tooltip from '@repo/ui/components/tremor-tooltip';

const ZOOM_STEP = 0.5;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const VIEWER_BUTTONS = {
    ROTATE_LEFT: 'rotateLeft',
    ROTATE_RIGHT: 'rotateRight',
    ZOOM_IN: 'zoomIn',
    ZOOM_OUT: 'zoomOut',
    RESET: 'reset',
    DOWNLOAD: 'download',
    FULLSCREEN: 'fullscreen'
} as const;
type ViewerButtonValue = typeof VIEWER_BUTTONS[keyof typeof VIEWER_BUTTONS];

interface ImageViewerProps {
    src: string;
    alt?: string;
    onClose?: () => void;
    className?: string;
    imageStyle?: React.CSSProperties;
    visibleButtons?: ViewerButtonValue[];
}

export function ImageViewer({
    src,
    alt = '',
    onClose,
    className,
    imageStyle,
    visibleButtons = Object.values(VIEWER_BUTTONS) // Default to showing all buttons
}: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isLoading, error } = useImageLoader({ src });

    // Reset view to default state
    const handleReset = useCallback(() => {
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Zoom handlers
    const handleZoomIn = useCallback(() =>
        setScale(s => Math.min(s + ZOOM_STEP, MAX_ZOOM)), []);

    const handleZoomOut = useCallback(() =>
        setScale(s => Math.max(s - ZOOM_STEP, MIN_ZOOM)), []);

    // Rotation handlers
    const handleRotateLeft = useCallback(() =>
        setRotation(r => r - 90), []);

    const handleRotateRight = useCallback(() =>
        setRotation(r => r + 90), []);

    const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
        if (event.ctrlKey) {
            event.preventDefault();
            const delta = event.deltaY * -0.01;
            setScale(scale => Math.min(Math.max(MIN_ZOOM, scale + delta), MAX_ZOOM));
        }
    }, [scale]);

    //reset view on image change
    useEffect(() => {
        handleReset();
    }, [src, handleReset]);

    // Enhanced gesture handling
    const bind = useGesture(
        {
            onDrag: ({ delta: [dx, dy], first, last }) => {
                if (scale > 1) {
                    if (first) {
                        // Set grabbing cursor
                        document.body.style.cursor = 'grabbing';
                    }

                    if (last) {
                        // Reset cursor on drag end
                        document.body.style.cursor = 'default';
                    }

                    setPosition(pos => ({
                        x: pos.x + dx, // Increment position based on the delta
                        y: pos.y + dy,
                    }));
                }
            },
            onDragEnd: () => {
                document.body.style.cursor = 'default';
            },
            onPinch: ({ offset: [d], event }) => {
                if (event instanceof TouchEvent || event instanceof WheelEvent) {
                    event?.preventDefault();
                }
                setScale(Math.min(Math.max(MIN_ZOOM, d), MAX_ZOOM));
            },
        },
        {
            eventOptions: { passive: false },
            drag: {
                from: () => [position.x, position.y],
            },
        }
    );

    // Fullscreen handling
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }, []);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard shortcuts
    useImageViewerKeyboard({
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onRotateLeft: handleRotateLeft,
        onRotateRight: handleRotateRight,
        onClose,
        onFullscreen: toggleFullscreen,
        onReset: handleReset,
        enabled: true,
    });

    // Download handler
    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.href = src;
        link.download = src.split('/').pop() || 'image';
        link.click();
    }, [src]);

    type ButtonWithTooltipProps = React.ComponentPropsWithoutRef<typeof Button> & {
        tooltip: string;
        children: React.ReactNode;
    }

    const ButtonWithTooltip = ({ tooltip, children, ...props }: ButtonWithTooltipProps) => (
        <Tooltip content={tooltip}>
            <Button {...props}>
                {children}
            </Button>
        </Tooltip>
    );

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-background/95">
                <div className="text-destructive flex flex-col items-center gap-2">
                    <X className="h-8 w-8" />
                    <p>Failed to load image</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                ' w-full h-full min-h-full bg-background/95 transform-none',
                className
            )}
            aria-label="Image viewer"
        >
            {/* Controls */}
            <div className="flex items-center justify-end gap-2 px-2 py-1">
                {visibleButtons.includes(VIEWER_BUTTONS.ROTATE_LEFT) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleRotateLeft}
                        aria-label="Rotate counter-clockwise"
                        tooltip="Rotate Left (Alt + L)"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.ROTATE_RIGHT) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleRotateRight}
                        aria-label="Rotate clockwise"
                        tooltip="Rotate Right (Alt + R)"
                    >
                        <RotateCw className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.ZOOM_IN) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleZoomIn}
                        aria-label="Zoom in"
                        tooltip="Zoom In (+)"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.ZOOM_OUT) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleZoomOut}
                        aria-label="Zoom out"
                        tooltip="Zoom Out (-)"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.RESET) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleReset}
                        aria-label="Reset view"
                        tooltip="Reset View (R)"
                    >
                        <ListRestart className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.DOWNLOAD) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={handleDownload}
                        aria-label="Download image"
                        tooltip="Download Image (D)"
                    >
                        <Download className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
                {visibleButtons.includes(VIEWER_BUTTONS.FULLSCREEN) && (
                    <ButtonWithTooltip
                        variant="secondary"
                        size="icon"
                        className="size-7 shadow"
                        onClick={toggleFullscreen}
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        tooltip={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
                    >
                        {isFullscreen ? (
                            <Minimize className="h-4 w-4" />
                        ) : (
                            <Maximize className="h-4 w-4" />
                        )}
                    </ButtonWithTooltip>
                )}
                {onClose && (
                    <ButtonWithTooltip
                        variant="destructive"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close viewer"
                        tooltip="Close (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </ButtonWithTooltip>
                )}
            </div>

            {/* Image container */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="w-32 h-32 bg-muted animate-pulse rounded-md" />
                    </motion.div>
                ) : (
                    <motion.div
                        {...bind() as any}
                        className="w-full h-full flex items-center justify-center overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onWheel={handleWheel}
                    >
                        <motion.img
                            src={src}
                            alt={alt}
                            className={cn(
                                "max-w-full max-h-full object-contain select-none",
                                scale > 1 && "cursor-grab active:cursor-grabbing"
                            )}
                            style={{
                                scale,
                                rotate: rotation,
                                x: position.x,
                                y: position.y,
                                touchAction: 'none',
                                ...imageStyle
                            }}
                            draggable={false}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}