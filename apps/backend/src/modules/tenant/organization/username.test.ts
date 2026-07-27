import { describe, expect, test } from "bun:test";

describe("username slug generation", () => {
    const slugify = (name: string): string => {
        if (!name || !name.trim()) return "";
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const ensureValid = (slug: string, prefix: string, id: string): string => {
        if (!slug) return `${prefix}-${id.slice(0, 8)}`;
        if (/^[-_]/.test(slug)) {
            slug = `slug-${slug.replace(/^[-_]+/, "")}`;
        }
        if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(slug)) {
            return `${prefix}-${id.slice(0, 8)}`;
        }
        return slug.slice(0, 64);
    };

    test("normal name produces valid slug", () => {
        expect(slugify("Shop 123")).toBe("shop-123");
        expect(slugify("My Store")).toBe("my-store");
    });

    test("special characters are replaced", () => {
        expect(slugify("Shop@#$%")).toBe("shop");
        expect(slugify("Store & More")).toBe("store-more");
    });

    test("multiple spaces/hyphens are collapsed", () => {
        expect(slugify("Shop   123")).toBe("shop-123");
        expect(slugify("Shop---123")).toBe("shop-123");
    });

    test("leading/trailing hyphens are trimmed", () => {
        expect(slugify("-shop-")).toBe("shop");
        expect(slugify("--shop--")).toBe("shop");
    });

    test("empty name produces empty slug", () => {
        expect(slugify("")).toBe("");
        expect(slugify("   ")).toBe("");
    });

    test("special-character-only name produces empty slug", () => {
        expect(slugify("@#$%")).toBe("");
        expect(slugify("!!!")).toBe("");
    });

    test("ensureValid handles empty slug", () => {
        const id = "12345678-1234-1234-1234-123456789012";
        expect(ensureValid("", "org", id)).toBe("org-12345678");
        expect(ensureValid("", "device", id)).toBe("device-12345678");
    });

    test("ensureValid handles leading underscore/hyphen", () => {
        const id = "12345678-1234-1234-1234-123456789012";
        expect(ensureValid("_shop", "org", id)).toBe("slug-shop");
        expect(ensureValid("-shop", "org", id)).toBe("slug-shop");
    });

    test("ensureValid handles valid long slug", () => {
        const id = "12345678-1234-1234-1234-123456789012";
        const longSlug = "a" + "b".repeat(63);
        expect(ensureValid(longSlug, "org", id).length).toBe(64);
    });
});

describe("collision suffix generation (suffix-aware truncation)", () => {
    const generateCollisionCandidate = (base: string, suffix: number): string => {
        const suffixLen = suffix.toString().length;
        const maxBaseLen = 64 - suffixLen - 1;
        return `${base.slice(0, maxBaseLen)}-${suffix}`;
    };

    test("64-char base with 1-digit suffix stays <= 64", () => {
        const base = "a".repeat(64);
        const candidate = generateCollisionCandidate(base, 2);
        expect(candidate.length).toBeLessThanOrEqual(64);
        expect(candidate).toBe("a".repeat(62) + "-2");
    });

    test("64-char base with 2-digit suffix stays <= 64", () => {
        const base = "a".repeat(64);
        const candidate = generateCollisionCandidate(base, 99);
        expect(candidate.length).toBeLessThanOrEqual(64);
        expect(candidate).toBe("a".repeat(61) + "-99");
    });

    test("64-char base with 3-digit suffix stays <= 64", () => {
        const base = "a".repeat(64);
        const candidate = generateCollisionCandidate(base, 100);
        expect(candidate.length).toBeLessThanOrEqual(64);
        expect(candidate).toBe("a".repeat(60) + "-100");
    });

    test("64-char base with 4-digit suffix stays <= 64", () => {
        const base = "a".repeat(64);
        const candidate = generateCollisionCandidate(base, 9999);
        expect(candidate.length).toBeLessThanOrEqual(64);
        expect(candidate).toBe("a".repeat(59) + "-9999");
    });

    test("short base keeps full name with 1-digit suffix", () => {
        const base = "shop";
        const candidate = generateCollisionCandidate(base, 2);
        expect(candidate).toBe("shop-2");
    });

    test("short base keeps full name with 3-digit suffix", () => {
        const base = "shop";
        const candidate = generateCollisionCandidate(base, 100);
        expect(candidate).toBe("shop-100");
    });
});

describe("username validation regex", () => {
    const usernameRegex = /^[a-z0-9][a-z0-9_-]{1,63}$/;

    test("valid usernames pass", () => {
        expect(usernameRegex.test("shop123")).toBe(true);
        expect(usernameRegex.test("shop-123")).toBe(true);
        expect(usernameRegex.test("shop_123")).toBe(true);
        expect(usernameRegex.test("a1")).toBe(true);
        expect(usernameRegex.test("a" + "b".repeat(63))).toBe(true);
    });

    test("invalid usernames fail", () => {
        expect(usernameRegex.test("-shop")).toBe(false);
        expect(usernameRegex.test("_shop")).toBe(false);
        expect(usernameRegex.test("a")).toBe(false);
        expect(usernameRegex.test("a".repeat(65))).toBe(false);
        expect(usernameRegex.test("Shop")).toBe(false);
        expect(usernameRegex.test("shop 123")).toBe(false);
        expect(usernameRegex.test("")).toBe(false);
    });
});
