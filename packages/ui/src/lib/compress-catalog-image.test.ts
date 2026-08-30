import { describe, expect, test } from "bun:test"

import {
    CATALOG_IMAGE_MAX_SOURCE_BYTES,
    canKeepOriginalCatalogImage,
    compressCatalogImage,
    formatCatalogImageSize,
    isHeicLikeImage,
} from "./compress-catalog-image"

const makeFile = (name: string, type: string, size: number) =>
    new File([new Uint8Array(size)], name, { type })

describe("catalog image compression rules", () => {
    test("keeps a small JPEG that already fits the catalog size budget", () => {
        expect(
            canKeepOriginalCatalogImage({
                type: "image/jpeg",
                size: 80 * 1024,
                width: 640,
                height: 480,
            }),
        ).toBe(true)
    })

    test("re-encodes a small JPEG that is still camera-width", () => {
        expect(
            canKeepOriginalCatalogImage({
                type: "image/jpeg",
                size: 80 * 1024,
                width: 4000,
                height: 3000,
            }),
        ).toBe(false)
    })

    test("re-encodes PNG even when it is already under 100 KB", () => {
        expect(
            canKeepOriginalCatalogImage({
                type: "image/png",
                size: 80 * 1024,
                width: 640,
                height: 480,
            }),
        ).toBe(false)
    })

    test("treats HEIC files as images that must be converted", () => {
        expect(isHeicLikeImage({ name: "lunch.HEIC", type: "" })).toBe(true)
        expect(isHeicLikeImage({ name: "lunch.jpg", type: "image/jpeg" })).toBe(false)
        expect(isHeicLikeImage({ name: "lunch", type: "image/heic" })).toBe(true)
    })

    test("rejects an oversized source before decoding it", async () => {
        const oversized = makeFile(
            "camera-original.jpg",
            "image/jpeg",
            CATALOG_IMAGE_MAX_SOURCE_BYTES + 1,
        )

        await expect(compressCatalogImage(oversized)).rejects.toThrow(
            "Choose an image smaller than 20 MB.",
        )
    })

    test("formats catalog image sizes in KB", () => {
        expect(formatCatalogImageSize(86 * 1024)).toBe("86 KB")
        expect(formatCatalogImageSize(900)).toBe("900 B")
    })
})
