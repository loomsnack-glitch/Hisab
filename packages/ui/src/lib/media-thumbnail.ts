const DEFAULT_OUTPUT_TYPE = "image/jpeg"

export type ThumbnailSource = "image" | "video" | "pdf" | "file"
export type ResizeFit = "contain" | "cover"

export interface CreateImageVariantOptions {
    width?: number
    height?: number
    maxWidth?: number
    maxHeight?: number
    fit?: ResizeFit
    allowUpscale?: boolean
    outputType?: string
    quality?: number
    fileName?: string
    backgroundColor?: string
}

export interface CreateThumbnailFileOptions
    extends Omit<CreateImageVariantOptions, "maxWidth" | "maxHeight"> {
    source?: ThumbnailSource
}

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file)
        const image = new Image()

        image.onload = () => {
            URL.revokeObjectURL(objectUrl)
            resolve(image)
        }

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error("Failed to load image."))
        }

        image.src = objectUrl
    })
}

const getOutputExtension = (outputType: string) => {
    switch (outputType) {
        case "image/png":
            return "png"
        case "image/webp":
            return "webp"
        default:
            return "jpg"
    }
}

export const sanitizeFileBaseName = (name: string, fallback = "file") => {
    const baseName = name.replace(/\.[^/.]+$/, "")
    return (
        baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || fallback
    )
}

const buildOutputFileName = (originalName: string, outputType: string, explicitFileName?: string) => {
    if (explicitFileName) return explicitFileName
    return `${sanitizeFileBaseName(originalName)}.${getOutputExtension(outputType)}`
}

const resolveBackgroundColor = (outputType: string, backgroundColor?: string) => {
    if (backgroundColor) return backgroundColor
    return outputType === DEFAULT_OUTPUT_TYPE ? "#ffffff" : undefined
}

const fillCanvasBackground = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    backgroundColor?: string,
) => {
    if (!backgroundColor) return
    context.fillStyle = backgroundColor
    context.fillRect(0, 0, width, height)
}

const canvasToFile = (
    canvas: HTMLCanvasElement,
    fileName: string,
    outputType: string,
    quality: number,
): Promise<File> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (!blob) {
                    reject(new Error("Failed to generate image file."))
                    return
                }

                resolve(
                    new File([blob], fileName, {
                        type: outputType,
                        lastModified: Date.now(),
                    }),
                )
            },
            outputType,
            quality,
        )
    })
}

const getContainDimensions = (
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
    allowUpscale: boolean,
) => {
    const ratio = Math.min(maxWidth / width, maxHeight / height, allowUpscale ? Number.POSITIVE_INFINITY : 1)

    return {
        width: Math.max(1, Math.round(width * ratio)),
        height: Math.max(1, Math.round(height * ratio)),
    }
}

const createContainedCanvas = (
    image: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    allowUpscale: boolean,
    backgroundColor?: string,
) => {
    const { width, height } = getContainDimensions(image.width, image.height, maxWidth, maxHeight, allowUpscale)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Failed to initialize image editor.")
    }

    fillCanvasBackground(context, width, height, backgroundColor)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(image, 0, 0, width, height)
    return canvas
}

const createFixedCanvas = (
    image: HTMLImageElement,
    width: number,
    height: number,
    fit: ResizeFit,
    allowUpscale: boolean,
    backgroundColor?: string,
) => {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Failed to initialize image editor.")
    }

    fillCanvasBackground(context, width, height, backgroundColor)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"

    const rawScale = fit === "cover"
        ? Math.max(width / image.width, height / image.height)
        : Math.min(width / image.width, height / image.height)
    const scale = allowUpscale ? rawScale : Math.min(rawScale, 1)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const drawX = (width - drawWidth) / 2
    const drawY = (height - drawHeight) / 2

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    return canvas
}

export const inferThumbnailSource = (file: File): ThumbnailSource => {
    if (file.type.startsWith("image/")) return "image"
    if (file.type.startsWith("video/")) return "video"
    if (file.type === "application/pdf") return "pdf"
    return "file"
}

export const canGenerateThumbnail = (source: ThumbnailSource) => source === "image"

export const createImageVariant = async (
    file: File,
    options: CreateImageVariantOptions = {},
): Promise<File> => {
    if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are supported.")
    }

    const image = await loadImageElement(file)
    const outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE
    const quality = options.quality ?? 0.92
    const backgroundColor = resolveBackgroundColor(outputType, options.backgroundColor)
    const canvas = options.width && options.height
        ? createFixedCanvas(
            image,
            options.width,
            options.height,
            options.fit ?? "cover",
            options.allowUpscale ?? true,
            backgroundColor,
        )
        : createContainedCanvas(
            image,
            options.maxWidth ?? image.width,
            options.maxHeight ?? image.height,
            options.allowUpscale ?? false,
            backgroundColor,
        )

    return canvasToFile(
        canvas,
        buildOutputFileName(file.name, outputType, options.fileName),
        outputType,
        quality,
    )
}

export const createThumbnailFile = async (
    file: File,
    options: CreateThumbnailFileOptions = {},
): Promise<File> => {
    const source = options.source ?? inferThumbnailSource(file)

    if (!canGenerateThumbnail(source)) {
        throw new Error(`Thumbnail generation for ${source} files is not implemented yet.`)
    }

    return createImageVariant(file, {
        width: options.width ?? 320,
        height: options.height ?? 320,
        fit: options.fit ?? "cover",
        allowUpscale: options.allowUpscale ?? true,
        outputType: options.outputType ?? DEFAULT_OUTPUT_TYPE,
        quality: options.quality ?? 0.72,
        fileName: options.fileName,
        backgroundColor: options.backgroundColor,
    })
}