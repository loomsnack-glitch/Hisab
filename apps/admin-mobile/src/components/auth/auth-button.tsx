import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";

export type AuthButtonVariant = "primary" | "secondary";

type AuthButtonProps = {
    label: string;
    onPress?: PressableProps["onPress"];
    disabled?: boolean;
    loading?: boolean;
    variant?: AuthButtonVariant;
    icon?: ReactNode;
};

const buttonClasses: Record<AuthButtonVariant, string> = {
    primary: "bg-admin-primary",
    secondary: "border border-admin-border bg-admin-surface dark:border-admin-border-dark dark:bg-admin-surface-dark",
};

const buttonTextClasses: Record<AuthButtonVariant, string> = {
    primary: "text-admin-primary-foreground",
    secondary: "text-admin-foreground dark:text-admin-foreground-dark",
};

const AuthButton = ({
    label,
    onPress,
    disabled = false,
    loading = false,
    variant = "primary",
    icon,
}: AuthButtonProps) => {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            className={`min-h-12 items-center justify-center rounded-2xl px-4 ${buttonClasses[variant]} ${
                isDisabled ? "opacity-60" : "active:opacity-90"
            }`}
            disabled={isDisabled}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
        >
            {loading ? (
                <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#2563eb"} />
            ) : (
                <View className="flex-row items-center gap-2">
                    {icon}
                    <Text className={`text-base font-semibold ${buttonTextClasses[variant]}`}>{label}</Text>
                </View>
            )}
        </Pressable>
    );
};

export default AuthButton;
