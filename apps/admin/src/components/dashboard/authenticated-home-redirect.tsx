import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";

import { getAuthenticatedHomePath } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";

type OrgRef = { id: string };

export function resolveAuthenticatedHomeRedirect(
    isPending: boolean,
    organizations: OrgRef[],
): string | null {
    if (isPending) {
        return null;
    }

    return getAuthenticatedHomePath(organizations);
}

export const AuthenticatedHomeRedirect = () => {
    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations =
        organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : [];
    const destination = resolveAuthenticatedHomeRedirect(organizationsQuery.isPending, organizations);

    if (!destination) {
        return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading" />;
    }

    return <Navigate to={destination} replace />;
};

export default AuthenticatedHomeRedirect;
