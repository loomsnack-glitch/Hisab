import { createImageVariant, loadImageElement } from "./media-thumbnail"

/** Product tiles are small; 800px covers 2–3x retina without shipping camera-sized files. */
export const CATALOG_IMAGE_MAX_EDGE = 800
/** ~100 KB is a practical cap for food photos at 800px JPEG without looking muddy. */
export const CATALOG_IMAGE_MAX_BYTES = 100 * 1024
/** Avoid decoding camera originals that would be unsafe on lower-memory devices. */
export const CATALOG_IMAGE_MAX_SOURCE_BYTES = 20 * 1024 * 1024
export const CATALOG_IMAGE_OUTPUT_TYPE = "image/jpeg"

export const CATALOG_IMAGE_ENCODE_ATTEMPTS = [
    { maxEdge: 800, quality: 0.78 },
    { maxEdge: 800, quality: 0.68 },
    { maxEdge: 720, quality: 0.62 },
    { maxEdge: 640, quality: 0.55 },
    { maxEdge: 512, quality: 0.5 },
    { maxEdge: 384, quality: 0.45 },
    { maxEdge: 256, quality: 0.4 },
] as const

export const isHeicLikeImage = (file: Pick<File, "name" | "type">) => {
    const name = file.name.toLowerCase()
    return (
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        name.endsWith(".heic") ||
        name.endsWith(".heif")
    )
}

export const canKeepOriginalCatalogImage = (input: {
    type: string
    size: number
    width: number
    height: number
}) => {
    const isJpeg = input.type === "image/jpeg" || input.type === "image/jpg"
    return (
        isJpeg &&
        input.size <= CATALOG_IMAGE_MAX_BYTES &&
        Math.max(input.width, input.height) <= CATALOG_IMAGE_MAX_EDGE
    )
}

export const formatCatalogImageSize = (bytes: number) => {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    return `${Math.round(bytes / 1024)} KB`
}

const getImageDimensions = async (file: File) => {
    const image = await loadImageElement(file)
    return { width: image.width, height: image.height }
}

const assertSafeCatalogImageSource = (file: File) => {
    if (file.size > CATALOG_IMAGE_MAX_SOURCE_BYTES) {
        throw new Error("Choose an image smaller than 20 MB.")
    }
}

const convertHeicToJpeg = async (file: File) => {
    const { default: heic2any } = await import("heic2any")
    const result = await heic2any({
        blob: file,
        toType: CATALOG_IMAGE_OUTPUT_TYPE,
        quality: 0.9,
    })
    const blob = Array.isArray(result) ? result[0] : result
    if (!blob) {
        throw new Error("Failed to convert HEIC image.")
    }

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: CATALOG_IMAGE_OUTPUT_TYPE,
        lastModified: Date.now(),
    })
}

export const compressCatalogImage = async (file: File): Promise<File> => {
    assertSafeCatalogImageSource(file)
    const source = isHeicLikeImage(file) ? await convertHeicToJpeg(file) : file
    assertSafeCatalogImageSource(source)

    if (!source.type.startsWith("image/")) {
        throw new Error("Only image files are supported.")
    }

    const dimensions = await getImageDimensions(source)
    if (
        canKeepOriginalCatalogImage({
            type: source.type,
            size: source.size,
            width: dimensions.width,
            height: dimensions.height,
        })
    ) {
        return source
    }

    const candidates: File[] = []
    for (const attempt of CATALOG_IMAGE_ENCODE_ATTEMPTS) {
        const next = await createImageVariant(source, {
            maxWidth: attempt.maxEdge,
            maxHeight: attempt.maxEdge,
            outputType: CATALOG_IMAGE_OUTPUT_TYPE,
            quality: attempt.quality,
            allowUpscale: false,
        })
        candidates.push(next)
        if (next.size <= CATALOG_IMAGE_MAX_BYTES) {
            return next
        }
    }

    throw new Error(
        "This image could not be reduced to 100 KB. Please choose a simpler image.",
    )
}
