import { ActivityIndicator, Pressable, Text } from "react-native";

type PrimaryButtonProps = {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: "dark" | "accent";
};

const PrimaryButton = ({ label, onPress, disabled, loading, variant = "dark" }: PrimaryButtonProps) => {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            className={`h-12 items-center justify-center rounded-2xl ${
                variant === "accent" ? "bg-amber-500" : "bg-stone-950"
            } ${isDisabled ? "opacity-60" : ""}`}
            disabled={isDisabled}
            onPress={onPress}
        >
            {loading ? (
                <ActivityIndicator color={variant === "accent" ? "#1c1917" : "#ffffff"} />
            ) : (
                <Text className={`text-base font-semibold ${variant === "accent" ? "text-stone-950" : "text-white"}`}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
};

export default PrimaryButton;
