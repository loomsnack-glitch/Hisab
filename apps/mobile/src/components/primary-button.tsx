import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type PrimaryButtonProps = {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: "primary" | "secondary";
    icon?: ReactNode;
};

const PrimaryButton = ({ label, onPress, disabled, loading, variant = "primary", icon }: PrimaryButtonProps) => {
    const isDisabled = disabled || loading;
    const isPrimary = variant === "primary";

    return (
        <Pressable
            className={`h-12 items-center justify-center rounded-2xl ${
                isPrimary ? "bg-primary" : "bg-secondary"
            } ${isDisabled ? "opacity-60" : "active:opacity-90"}`}
            disabled={isDisabled}
            onPress={onPress}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? "#ffffff" : "#374151"} />
            ) : (
                <View className="flex-row items-center gap-2">
                    {icon}
                    <Text
                        className={`text-base font-semibold ${isPrimary ? "text-primary-foreground" : "text-secondary-foreground"}`}
                    >
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

export default PrimaryButton;
