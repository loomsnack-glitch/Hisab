import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";

import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import EditOrganizationDialog from "@/components/organizations/edit-organization-dialog";
import {
    OrganizationPickerView,
    organizationPickerAddTrigger,
} from "@/components/organizations/organization-picker";
import { persistStarredOrgId, readStarredOrgId } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";

const OrganizationsPage = () => {
    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });
    const [starredOrgId, setStarredOrgId] = useState(readStarredOrgId);
    const [isManaging, setIsManaging] = useState(false);

    const organizations =
        organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : [];

    const handleToggleStar = (organizationId: string) => {
        setStarredOrgId((previous) => {
            const next = previous === organizationId ? "" : organizationId;
            persistStarredOrgId(next || null);
            return next;
        });
    };

    const errorMessage =
        organizationsQuery.isError || organizationsQuery.data?.status === "error"
            ? (organizationsQuery.error as { message?: string })?.message ??
              organizationsQuery.data?.message ??
              "Something went wrong while loading your workspace."
            : null;

    return (
        <OrganizationPickerView
            organizations={organizations}
            starredOrgId={starredOrgId}
            isManaging={isManaging}
            isLoading={organizationsQuery.isPending}
            errorMessage={errorMessage}
            addOrganization={
                <CreateOrganizationDialog
                    trigger={
                        <button
                            type="button"
                            className="flex size-full cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                            aria-label="Add organization"
                        >
                            {organizationPickerAddTrigger}
                        </button>
                    }
                />
            }
            renderOrganizationAction={(organization, tile) => (
                <EditOrganizationDialog
                    organization={organization}
                    trigger={tile}
                />
            )}
            onToggleStar={handleToggleStar}
            onToggleManaging={() => setIsManaging((current) => !current)}
            onRetry={() => {
                void organizationsQuery.refetch();
            }}
        />
    );
};

export default OrganizationsPage;
