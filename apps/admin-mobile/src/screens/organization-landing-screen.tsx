import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";
import type { OrganizationDTO } from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import { useAdminLogout } from "../hooks/use-admin-logout";
import SessionStatusScreen from "./session-status-screen";
import { adminOrganizationKeys } from "../lib/organization-keys";
import { resolveOrganizationLanding } from "../lib/organization-routing";

const asOrganizationRefs = (organizations: OrganizationDTO[]) =>
    organizations.map(({ id, name }) => ({ id, name }));

const OrganizationLandingScreen = () => {
    const logoutMutation = useAdminLogout();
    const organizationsQuery = useQuery({
        queryKey: adminOrganizationKeys.list,
        queryFn: getOrganizations,
    });

    if (organizationsQuery.isPending) {
        return (
            <SessionStatusScreen
                title="Loading your organizations"
                subtitle="Preparing your Ganatri Admin workspace."
                loading
                footer={
                    <AuthButton
                        label="Sign out"
                        variant="secondary"
                        loading={logoutMutation.isPending}
                        onPress={() => logoutMutation.mutate()}
                    />
                }
            />
        );
    }

    if (organizationsQuery.isError || organizationsQuery.data?.status === "error") {
        return (
            <SessionStatusScreen
                title="Organizations unavailable"
                subtitle={
                    organizationsQuery.error instanceof Error
                        ? organizationsQuery.error.message
                        : organizationsQuery.data?.message || "Try again in a moment."
                }
                footer={
                    <AuthButton
                        label="Sign out"
                        variant="secondary"
                        loading={logoutMutation.isPending}
                        onPress={() => logoutMutation.mutate()}
                    />
                }
            />
        );
    }

    const organizations =
        organizationsQuery.data?.status === "success"
            ? organizationsQuery.data.data?.organizations ?? []
            : [];
    const landing = resolveOrganizationLanding(asOrganizationRefs(organizations));

    return (
        <SessionStatusScreen
            title={
                landing.mode === "setup"
                    ? "Create your organization"
                    : landing.mode === "workspace"
                      ? landing.organization.name
                      : "Choose an organization"
            }
            subtitle="Organization setup and selection will be connected in the next Admin mobile slices."
            footer={
                <AuthButton
                    label="Sign out"
                    variant="secondary"
                    loading={logoutMutation.isPending}
                    onPress={() => logoutMutation.mutate()}
                />
            }
        />
    );
};

export default OrganizationLandingScreen;
