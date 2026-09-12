import type * as React from "react"

// Safe-area padding lives on the viewport wrapper, not the footer. That keeps
// short dialogs tight while tall ones stay below the status bar / above the home indicator.
export const DIALOG_VIEWPORT_CENTER_CLASSNAME =
  "flex h-full w-full min-h-0 items-center justify-center px-[max(1rem,env(safe-area-inset-left,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]"

export const DIALOG_MAX_HEIGHT =
  "calc(100dvh - max(1rem, env(safe-area-inset-top, 0px)) - max(1rem, env(safe-area-inset-bottom, 0px)))"

export const dialogViewportCssVars = {
  "--dialog-max-height": DIALOG_MAX_HEIGHT,
} as React.CSSProperties

export const capToDialogViewport = (
  style: React.CSSProperties | undefined
): React.CSSProperties => {
  const requested = style?.maxHeight
  return {
    ...style,
    maxHeight: requested
      ? `min(${typeof requested === "number" ? `${requested}px` : requested}, var(--dialog-max-height))`
      : "var(--dialog-max-height)",
  }
}
