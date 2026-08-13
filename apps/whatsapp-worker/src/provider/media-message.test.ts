import { describe, expect, test } from "bun:test";
import { createOutboundMediaMessage } from "./media-message.js";

describe("WhatsApp outbound media messages", () => {
    test("sends images as native image messages", () => {
        const media = Buffer.from("image");

        expect(createOutboundMediaMessage(media, "receipt.png", "image/png", "Receipt")).toEqual({
            image: media,
            mimetype: "image/png",
            caption: "Receipt",
        });
    });

    test("sends PDFs as document messages", () => {
        const media = Buffer.from("pdf");

        expect(createOutboundMediaMessage(media, "receipt.pdf", "application/pdf", "Receipt")).toEqual({
            document: media,
            fileName: "receipt.pdf",
            mimetype: "application/pdf",
            caption: "Receipt",
        });
    });
});
