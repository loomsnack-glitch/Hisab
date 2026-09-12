import { useState } from "react";
import { Pressable, Text, View } from "react-native";
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
    onSignOut: () => void;
    signingOut: boolean;
};

const OrganizationSetup = ({ onCreated, onSignOut, signingOut }: OrganizationSetupProps) => {
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
                <AuthButton
                    label="Sign out"
                    variant="secondary"
                    loading={signingOut}
                    onPress={onSignOut}
                />
            </View>
        </AuthShell>
    );
};

type OrganizationPickerProps = {
    organizations: OrganizationRef[];
    onSelect: (organization: OrganizationRef) => void;
    onSignOut: () => void;
    signingOut: boolean;
};

const OrganizationPicker = ({
    organizations,
    onSelect,
    onSignOut,
    signingOut,
}: OrganizationPickerProps) => (
    <View className="flex-1 bg-admin-background px-5 py-8 dark:bg-admin-background-dark">
        <View className="mb-8">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-admin-primary">
                Ganatri Admin
            </Text>
            <Text className="mt-2 text-3xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                Choose an organization
            </Text>
            <Text className="mt-2 text-base leading-6 text-admin-muted dark:text-admin-muted-dark">
                Select the workspace you want to manage.
            </Text>
        </View>
        <View className="gap-3">
            {organizations.map((organization) => (
                <Pressable
                    key={organization.id}
                    className="flex-row items-center rounded-2xl border border-admin-border bg-admin-surface px-4 py-4 dark:border-admin-border-dark dark:bg-admin-surface-dark"
                    onPress={() => onSelect(organization)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${organization.name}`}
                >
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-admin-primary">
                        <Text className="text-lg font-bold text-admin-primary-foreground">
                            {organization.name.slice(0, 1).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-admin-foreground dark:text-admin-foreground-dark">
                            {organization.name}
                        </Text>
                        <Text className="mt-1 text-sm text-admin-muted dark:text-admin-muted-dark">
                            Open workspace
                        </Text>
                    </View>
                    <Text className="text-xl font-semibold text-admin-primary">›</Text>
                </Pressable>
            ))}
        </View>
        <View className="mt-auto pt-8">
            <AuthButton
                label="Sign out"
                variant="secondary"
                loading={signingOut}
                onPress={onSignOut}
            />
        </View>
    </View>
);

type OrganizationWorkspaceProps = {
    organization: OrganizationRef;
    canChangeOrganization: boolean;
    onChangeOrganization: () => void;
    onSignOut: () => void;
    signingOut: boolean;
};

const OrganizationWorkspace = ({
    organization,
    canChangeOrganization,
    onChangeOrganization,
    onSignOut,
    signingOut,
}: OrganizationWorkspaceProps) => (
    <View className="flex-1 bg-admin-background px-5 py-8 dark:bg-admin-background-dark">
        <View className="flex-1 justify-center">
            <View className="mb-6 h-14 w-14 items-center justify-center rounded-2xl bg-admin-primary">
                <Text className="text-2xl font-bold text-admin-primary-foreground">
                    {organization.name.slice(0, 1).toUpperCase()}
                </Text>
            </View>
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-admin-primary">
                Ganatri Admin workspace
            </Text>
            <Text className="mt-3 text-3xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                {organization.name}
            </Text>
            <Text className="mt-3 text-base leading-6 text-admin-muted dark:text-admin-muted-dark">
                Your organization is ready. Catalog, billing, and other Admin modules will be added in later product phases.
            </Text>
        </View>
        <View className="gap-3">
            {canChangeOrganization ? (
                <AuthButton
                    label="Change organization"
                    variant="secondary"
                    onPress={onChangeOrganization}
                />
            ) : null}
            <AuthButton
                label="Sign out"
                variant="secondary"
                loading={signingOut}
                onPress={onSignOut}
            />
        </View>
    </View>
);

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
                    <View className="gap-3">
                        <AuthButton
                            label="Try again"
                            onPress={() => void organizationsQuery.refetch()}
                        />
                        <AuthButton
                            label="Sign out"
                            variant="secondary"
                            loading={logoutMutation.isPending}
                            onPress={() => logoutMutation.mutate()}
                        />
                    </View>
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
                onSignOut={() => logoutMutation.mutate()}
                signingOut={logoutMutation.isPending}
            />
        );
    }

    if (landing.mode === "picker") {
        return (
            <OrganizationPicker
                organizations={landing.organizations}
                onSelect={setSelectedOrganization}
                onSignOut={() => logoutMutation.mutate()}
                signingOut={logoutMutation.isPending}
            />
        );
    }

    return (
        <OrganizationWorkspace
            organization={landing.organization}
            canChangeOrganization={organizations.length > 1}
            onChangeOrganization={() => setSelectedOrganization(null)}
            onSignOut={() => logoutMutation.mutate()}
            signingOut={logoutMutation.isPending}
        />
    );
};

export default OrganizationLandingScreen;
