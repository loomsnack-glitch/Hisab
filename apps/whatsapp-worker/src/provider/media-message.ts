import type { AnyMediaMessageContent } from "baileys";

export const createOutboundMediaMessage = (
    media: Buffer,
    fileName: string,
    mimeType: string,
    caption?: string,
): AnyMediaMessageContent => {
    if (mimeType.trim().toLowerCase().startsWith("image/")) {
        return {
            image: media,
            mimetype: mimeType,
            caption,
        };
    }

    return {
        document: media,
        fileName,
        mimetype: mimeType,
        caption,
    };
};
