import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";

type AuthShellProps = {
    title: string;
    subtitle?: string;
    stepLabel?: string;
    currentStep?: number;
    totalSteps?: number;
    children: ReactNode;
};

const AuthShell = ({
    title,
    subtitle,
    stepLabel,
    currentStep,
    totalSteps,
    children,
}: AuthShellProps) => {
    const insets = useSafeAreaInsets();
    const hasProgress =
        typeof currentStep === "number" &&
        typeof totalSteps === "number" &&
        totalSteps > 0 &&
        currentStep > 0 &&
        currentStep <= totalSteps;

    return (
        <View className="flex-1 bg-admin-background dark:bg-admin-background-dark">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="grow px-5"
                    contentContainerStyle={{
                        paddingTop: insets.top + 24,
                        paddingBottom: insets.bottom + 28,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                >
                    <View className="mb-8 flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-admin-primary shadow-sm">
                            <Text className="text-xl font-bold text-admin-primary-foreground">G</Text>
                        </View>
                        <View>
                            <Text className="text-xs font-semibold uppercase tracking-[2px] text-admin-primary">
                                Ganatri
                            </Text>
                            <Text className="mt-0.5 text-sm font-medium text-admin-muted dark:text-admin-muted-dark">
                                Admin
                            </Text>
                        </View>
                    </View>

                    <View className="mb-6 gap-2">
                        {hasProgress ? (
                            <View className="mb-1 gap-2">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-admin-primary">
                                        {stepLabel ?? `Step ${currentStep} of ${totalSteps}`}
                                    </Text>
                                    <Text className="text-xs font-medium text-admin-muted dark:text-admin-muted-dark">
                                        {currentStep}/{totalSteps}
                                    </Text>
                                </View>
                                <View
                                    className="flex-row gap-1.5"
                                    accessibilityRole="progressbar"
                                    accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
                                    accessibilityLabel="Registration progress"
                                >
                                    {Array.from({ length: totalSteps }, (_, index) => (
                                        <View
                                            key={index}
                                            className={`h-1.5 flex-1 rounded-full ${
                                                index < currentStep
                                                    ? "bg-admin-primary"
                                                    : "bg-admin-border dark:bg-admin-border-dark"
                                            }`}
                                        />
                                    ))}
                                </View>
                            </View>
                        ) : null}
                        <Text className="text-3xl font-bold tracking-tight text-admin-foreground dark:text-admin-foreground-dark">
                            {title}
                        </Text>
                        {subtitle ? (
                            <Text className="text-base leading-6 text-admin-muted dark:text-admin-muted-dark">
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>

                    <View className="rounded-[28px] border border-admin-border bg-admin-surface p-5 shadow-sm dark:border-admin-border-dark dark:bg-admin-surface-dark">
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default AuthShell;
