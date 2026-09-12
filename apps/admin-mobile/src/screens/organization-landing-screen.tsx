import { useState } from "react";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createOrganization, getOrganizations } from "@repo/services";
import {
    CreateOrganizationSchema,
    type CreateOrganizationJSON,
    type OrganizationDTO,
} from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthShell from "../components/auth/auth-shell";
import { useAdminLogout } from "../hooks/use-admin-logout";
import SessionStatusScreen from "./session-status-screen";
import { adminOrganizationKeys } from "../lib/organization-keys";
import {
    resolveOrganizationLanding,
    type OrganizationRef,
} from "../lib/organization-routing";

const asOrganizationRefs = (organizations: OrganizationDTO[]) =>
    organizations.map(({ id, name }) => ({ id, name }));

const getErrorMessage = (error: unknown, fallback: string) => {
    if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
};

type OrganizationSetupProps = {
    onCreated: (organization: OrganizationRef) => void;
};

const OrganizationSetup = ({ onCreated }: OrganizationSetupProps) => {
    const [feedback, setFeedback] = useState<string | null>(null);
    const form = useForm<CreateOrganizationJSON>({
        resolver: zodResolver(CreateOrganizationSchema),
        defaultValues: { name: "", username: "" },
    });

    const submit: SubmitHandler<CreateOrganizationJSON> = async (values) => {
        setFeedback(null);
        try {
            const response = await createOrganization(values);
            if (response.status === "error") {
                setFeedback(response.message || "Unable to create your organization.");
                return;
            }

            const organization = response.data?.organization;
            if (!organization) {
                setFeedback("Organization creation did not return a valid workspace.");
                return;
            }

            onCreated({ id: organization.id, name: organization.name });
        } catch (error) {
            setFeedback(
                getErrorMessage(error, "Unable to create your organization. Please try again."),
            );
        }
    };

    return (
        <AuthShell
            title="Create your organization"
            subtitle="Set up the first workspace for your Ganatri Admin account."
        >
            <View className="gap-5">
                <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <AuthField
                            label="Organization name"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            required
                            placeholder="Acme Retail"
                        />
                    )}
                />
                <Controller
                    control={form.control}
                    name="username"
                    render={({ field, fieldState }) => (
                        <AuthField
                            label="Organization username"
                            value={field.value}
                            onChangeText={(value) => field.onChange(value.toLowerCase())}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            required
                            placeholder="acme-retail"
                            autoCapitalize="none"
                            hint="Use lowercase letters, numbers, hyphens, or underscores."
                        />
                    )}
                />
                {feedback ? <AuthFeedback message={feedback} /> : null}
                <AuthButton
                    label="Create organization"
                    loading={form.formState.isSubmitting}
                    onPress={form.handleSubmit(submit)}
                />
            </View>
        </AuthShell>
    );
};

const OrganizationLandingScreen = () => {
    const logoutMutation = useAdminLogout();
    const queryClient = useQueryClient();
    const [selectedOrganization, setSelectedOrganization] = useState<OrganizationRef | null>(null);
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
    const landing = selectedOrganization
        ? { mode: "workspace" as const, organization: selectedOrganization }
        : resolveOrganizationLanding(asOrganizationRefs(organizations));

    if (landing.mode === "setup") {
        return (
            <OrganizationSetup
                onCreated={(organization) => {
                    setSelectedOrganization(organization);
                    void queryClient.invalidateQueries({
                        queryKey: adminOrganizationKeys.list,
                    });
                }}
            />
        );
    }

    return (
        <SessionStatusScreen
            title={
                landing.mode === "workspace"
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
