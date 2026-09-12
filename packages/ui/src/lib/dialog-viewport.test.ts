import { describe, expect, test } from "bun:test"

import { capToDialogViewport, DIALOG_MAX_HEIGHT } from "./dialog-viewport"

describe("dialog viewport cap", () => {
    test("keeps short dialogs unconstrained besides the safe viewport max", () => {
        expect(capToDialogViewport({ zIndex: 60 }).maxHeight).toBe(
            "var(--dialog-max-height)",
        )
        expect(DIALOG_MAX_HEIGHT).toContain("env(safe-area-inset-top")
        expect(DIALOG_MAX_HEIGHT).toContain("env(safe-area-inset-bottom")
    })

    test("never lets a requested max-height exceed the safe viewport", () => {
        expect(capToDialogViewport({ maxHeight: "calc(100dvh - 2rem)" }).maxHeight).toBe(
            "min(calc(100dvh - 2rem), var(--dialog-max-height))",
        )
    })
})
