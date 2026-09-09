type OrgRef = { id: string };

export const STARRED_ORG_KEY = "hisab_starred_org_id";

export function readStarredOrgId(): string {
    if (typeof window === "undefined") {
        return "";
    }

    return window.localStorage.getItem(STARRED_ORG_KEY) ?? "";
}

export function persistStarredOrgId(organizationId: string | null): void {
    if (typeof window === "undefined") {
        return;
    }

    if (organizationId) {
        window.localStorage.setItem(STARRED_ORG_KEY, organizationId);
        return;
    }

    window.localStorage.removeItem(STARRED_ORG_KEY);
}

export function clearStarredOrgId(): void {
    persistStarredOrgId(null);
}

/** Prefer the starred organization. Do not fall back to another organization. */
export function resolveDefaultOrgId(organizations: OrgRef[]): string | null {
    if (organizations.length === 0) {
        return null;
    }

    const starredId = readStarredOrgId();
    if (starredId && organizations.some((org) => org.id === starredId)) {
        return starredId;
    }

    return null;
}

/** Authenticated landing path: starred Organization workspace, or the picker when none is starred. */
export function getAuthenticatedHomePath(organizations: OrgRef[]): string {
    const orgId = resolveDefaultOrgId(organizations);
    return orgId ? getOrganizationWorkspacePath(orgId) : "/organizations";
}

export function isOrganizationPickerPath(pathname: string): boolean {
    return pathname === "/organizations";
}

export function getOrganizationWorkspacePath(organizationId: string): string {
    return `/organizations/${organizationId}/products`;
}
