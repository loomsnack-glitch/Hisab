type OrgRef = { id: string };

const STARRED_ORG_KEY = "hisab_starred_org_id";

/** Prefer starred org, otherwise the first in the list. */
export function resolveDefaultOrgId(organizations: OrgRef[]): string | null {
    if (organizations.length === 0) {
        return null;
    }

    const starredId =
        typeof window !== "undefined" ? window.localStorage.getItem(STARRED_ORG_KEY) : null;

    if (starredId && organizations.some((org) => org.id === starredId)) {
        return starredId;
    }

    return organizations[0]?.id ?? null;
}

/** Authenticated landing path: default org stores, or the organizations list when empty. */
export function getAuthenticatedHomePath(organizations: OrgRef[]): string {
    const orgId = resolveDefaultOrgId(organizations);
    return orgId ? `/organizations/${orgId}/stores` : "/organizations";
}
