export const organizationInspectionSections = [
    "overview",
    "stores",
    "catalog",
    "billing",
    "customers",
    "reports",
    "tables",
    "purchases",
    "whatsapp",
] as const;

export type OrganizationInspectionSection = (typeof organizationInspectionSections)[number];

export type OrganizationInspectionLocation =
    | { kind: "directory" }
    | {
        kind: "workspace";
        organizationId: string;
        section: OrganizationInspectionSection;
        resourceId?: string;
    }
    | { kind: "invalid"; reason: "missing-organization" | "unknown-section" };

const ORGANIZATIONS_PREFIX = "/organizations";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isInspectionSection = (value: string): value is OrganizationInspectionSection =>
    (organizationInspectionSections as readonly string[]).includes(value);

export const isOrganizationsPath = (pathname: string) =>
    pathname === ORGANIZATIONS_PREFIX || pathname.startsWith(`${ORGANIZATIONS_PREFIX}/`);

export const organizationDirectoryPath = ORGANIZATIONS_PREFIX;

export const organizationInspectionPath = (
    organizationId: string,
    section: OrganizationInspectionSection = "overview",
    resourceId?: string,
) => {
    if (section === "overview" && !resourceId) {
        return `${ORGANIZATIONS_PREFIX}/${organizationId}`;
    }
    if (resourceId) {
        return `${ORGANIZATIONS_PREFIX}/${organizationId}/${section}/${resourceId}`;
    }
    return `${ORGANIZATIONS_PREFIX}/${organizationId}/${section}`;
};

export const parseOrganizationInspectionPath = (pathname: string): OrganizationInspectionLocation | null => {
    if (pathname === ORGANIZATIONS_PREFIX) return { kind: "directory" };
    if (!pathname.startsWith(`${ORGANIZATIONS_PREFIX}/`)) return null;

    const parts = pathname.slice(`${ORGANIZATIONS_PREFIX}/`.length).split("/").filter(Boolean);
    if (parts.length === 0) return { kind: "directory" };

    const organizationId = parts[0] ?? "";
    if (!UUID_PATTERN.test(organizationId)) {
        return { kind: "invalid", reason: "missing-organization" };
    }

    if (parts.length === 1) {
        return { kind: "workspace", organizationId, section: "overview" };
    }

    const sectionPart = parts[1] ?? "";
    if (!isInspectionSection(sectionPart)) {
        return { kind: "invalid", reason: "unknown-section" };
    }

    const resourceId = parts[2];
    if (sectionPart === "overview") {
        return { kind: "workspace", organizationId, section: "overview" };
    }

    return resourceId
        ? { kind: "workspace", organizationId, section: sectionPart, resourceId }
        : { kind: "workspace", organizationId, section: sectionPart };
};
