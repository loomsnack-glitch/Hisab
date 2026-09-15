/** Viewport-based scroll shell for POS settings routes (matches billing POS layout). */
export const posSettingsPageShellClassName =
    "h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] max-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:max-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))]";

export const posSettingsPageContentClassName = "w-full p-4 sm:p-6";
