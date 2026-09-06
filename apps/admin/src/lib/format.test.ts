import { describe, expect, test } from "bun:test";

import { formatDiscountPercentage, formatWhatsAppDayLabel, formatWhatsAppTimestamp, getAverageBillPerOrder, getDiscountPercentage } from "./format";
import { filterWhatsAppConversations } from "./whatsapp-inbox";

const conversations = [
    {
        displayName: "Asha Patel",
        contactPhoneNumber: "+919876543210",
        unreadCount: 2,
    },
    {
        displayName: "Rahul Shah",
        contactPhoneNumber: "+919812345678",
        unreadCount: 0,
    },
] as const;

describe("WhatsApp timestamp formatting", () => {
    test("formats timestamps as day/month/year with an AM/PM time", () => {
        expect(formatWhatsAppTimestamp(new Date(2026, 7, 30, 21, 24))).toBe("30/08/2026 09:24 PM");
    });

    test("labels today and yesterday before using a calendar date", () => {
        const now = new Date();
        expect(formatWhatsAppDayLabel(now)).toBe("Today");

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        expect(formatWhatsAppDayLabel(yesterday)).toBe("Yesterday");
    });
});

describe("WhatsApp conversation filtering", () => {
    test("filters by name or phone, including formatted phone input", () => {
        expect(filterWhatsAppConversations(conversations, "asha")).toHaveLength(1);
        expect(filterWhatsAppConversations(conversations, "9812")).toHaveLength(1);
        expect(filterWhatsAppConversations(conversations, "98765 43210")).toEqual([conversations[0]]);
    });

    test("does not crash when a conversation has incomplete contact text", () => {
        expect(filterWhatsAppConversations([{ displayName: null, contactPhoneNumber: null }], "asha")).toEqual([]);
    });
});

describe("discount formatting", () => {
    test("calculates a discount percentage from the original amount", () => {
        expect(getDiscountPercentage(25, 100)).toBe(25);
        expect(formatDiscountPercentage(25, 100)).toBe("25%");
    });

    test("rounds percentages to one decimal place", () => {
        expect(formatDiscountPercentage(10, 80)).toBe("12.5%");
    });

    test("does not calculate a percentage without a positive base", () => {
        expect(getDiscountPercentage(10, 0)).toBeNull();
        expect(formatDiscountPercentage(0, 100)).toBeNull();
    });
});

describe("average bill per order", () => {
    test("divides total sales by the number of completed orders", () => {
        expect(getAverageBillPerOrder(600, 2)).toBe(300);
    });

    test("is zero when there are no completed orders", () => {
        expect(getAverageBillPerOrder(0, 0)).toBe(0);
    });
});
