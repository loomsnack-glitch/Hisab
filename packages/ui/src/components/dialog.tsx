"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@repo/ui/lib/utils"
import { Button } from "@repo/ui/components/button"
import { XIcon } from "lucide-react"

const DialogDismissalContext = React.createContext(false)

const getNestedLayerStyle = (
  baseZIndex: number
): React.CSSProperties => ({
  zIndex: `calc(${baseZIndex} + (var(--nested-dialogs, 0) * 10))`,
})

const getNestedBackdropStyle = (
  style:
    | React.CSSProperties
    | ((state: any) => React.CSSProperties | undefined)
    | undefined,
  baseZIndex: number
): ((state: any) => React.CSSProperties | undefined) => {
  const zIndex = `calc(${baseZIndex} + (var(--nested-dialogs, 0) * 10))`

  return (state) => ({
    ...(typeof style === "function" ? style(state) : style),
    zIndex,
  })
}

const getNestedPopupStyle = (
  style:
    | React.CSSProperties
    | ((state: any) => React.CSSProperties | undefined)
    | undefined,
  baseZIndex: number
): ((state: any) => React.CSSProperties | undefined) => {
  const zIndex = `calc(${baseZIndex} + (var(--nested-dialogs, 0) * 10))`

  return (state) => ({
    ...(typeof style === "function" ? style(state) : style),
    zIndex,
  })
}

function Dialog({
  disablePointerDismissal,
  children,
  ...props
}: DialogPrimitive.Root.Props) {
  return (
    <DialogDismissalContext.Provider value={!!disablePointerDismissal}>
      <DialogPrimitive.Root
        data-slot="dialog"
        disablePointerDismissal={disablePointerDismissal}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogDismissalContext.Provider>
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  style,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate",
        className
      )}
      style={getNestedBackdropStyle(style, 50)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  style,
  onAnimationEnd,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const disablePointerDismissal = React.useContext(DialogDismissalContext)
  const popupRef = React.useRef<HTMLDivElement>(null)

  const handleOutsidePointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      if (!disablePointerDismissal) {
        return
      }

      const target = event.target
      if (!(target instanceof Node) || popupRef.current?.contains(target)) {
        return
      }

    },
    [disablePointerDismissal]
  )

  return (
    <DialogPortal>
      <DialogOverlay onPointerDown={handleOutsidePointerDown} />
      {/* Scrollable overlay wrapper centers short dialogs and scrolls tall ones. */}
      <div
        className="group/dialog-layer fixed inset-0 overflow-y-auto"
        style={getNestedLayerStyle(60)}
        onPointerDown={handleOutsidePointerDown}
      >
        {/* Nested dialogs skip the backdrop (z-index sits below the parent popup), so this scrim
            covers the parent dialog with the same blur/dim effect as the root backdrop. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 hidden bg-black/10 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/20 dark:supports-backdrop-filter:backdrop-blur group-has-[[data-nested][data-open]]/dialog-layer:block"
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPrimitive.Popup
            ref={popupRef}
            data-slot="dialog-content"
            className={cn(
              "bg-background data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 sm:max-w-sm w-full outline-none relative transition-[scale,opacity] duration-100 data-nested-dialog-open:scale-[calc(1-0.02*var(--nested-dialogs))] data-nested:relative data-nested:z-10 data-nested:shadow-2xl data-nested:ring-foreground/15 after:absolute after:inset-0 after:rounded-[inherit] after:bg-black/30 after:opacity-0 after:transition-opacity after:duration-100 after:pointer-events-none data-nested-dialog-open:after:opacity-100 dark:after:bg-black/50",
              className
            )}
            style={getNestedPopupStyle(style, 60)}
            {...props}
          >
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                render={
                  <Button
                    variant="ghost"
                    className="absolute top-2 right-2"
                    size="icon-sm"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Popup>
        </div>
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("gap-2 flex flex-col", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
