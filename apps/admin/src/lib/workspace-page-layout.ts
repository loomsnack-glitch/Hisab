/** Locks admin workspace table pages to the viewport below header and main padding. */
export const adminWorkspacePageHeightClass =
    "flex min-h-0 min-w-0 flex-col overflow-hidden h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-2rem-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-4rem)]";

/** Full-height pages rendered inside another tabbed workspace shell. */
export const adminNestedTabPageHeightClass =
    "flex min-h-0 min-w-0 flex-col overflow-hidden h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-2rem-var(--pos-mobile-nav-height,0px)-3.25rem)] lg:h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-4rem-3.25rem)]";
