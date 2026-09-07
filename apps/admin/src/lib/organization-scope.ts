type OrgRef = { id: string };

export function isOrganizationInScope(organizationId: string, organizations: OrgRef[]): boolean {
    return organizations.some((organization) => organization.id === organizationId);
}

export function shouldRedirectUnknownOrganization({
    organizationId,
    isOrganizationsPending,
    organizations,
    isPickerPage,
}: {
    organizationId?: string;
    isOrganizationsPending: boolean;
    organizations: OrgRef[];
    isPickerPage: boolean;
}): boolean {
    if (!organizationId || isPickerPage || isOrganizationsPending) {
        return false;
    }

    return !isOrganizationInScope(organizationId, organizations);
}
