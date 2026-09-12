export type OrganizationRef = {
    id: string;
    name: string;
};

export type OrganizationLanding =
    | { mode: "setup" }
    | { mode: "workspace"; organization: OrganizationRef }
    | { mode: "picker"; organizations: OrganizationRef[] };

export const resolveOrganizationLanding = (
    organizations: OrganizationRef[],
): OrganizationLanding => {
    if (organizations.length === 0) {
        return { mode: "setup" };
    }

    if (organizations.length === 1) {
        return { mode: "workspace", organization: organizations[0] };
    }

    return { mode: "picker", organizations };
};
