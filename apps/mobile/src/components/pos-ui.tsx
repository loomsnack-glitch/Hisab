import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import {
    type PosButtonVariant,
    type PosStatusTone,
} from "./pos-ui-boundary";

type PosButtonProps = {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: PosButtonVariant;
    icon?: ReactNode;
};

const buttonVariantClasses: Record<PosButtonVariant, string> = {
    primary: "bg-pos-primary dark:bg-pos-primary-dark",
    secondary: "border border-pos-border bg-pos-surface dark:border-pos-border-dark dark:bg-pos-surface-dark",
    destructive: "bg-pos-danger dark:bg-pos-danger-dark",
};

const buttonTextClasses: Record<PosButtonVariant, string> = {
    primary: "text-pos-primary-foreground dark:text-pos-primary-foreground-dark",
    secondary: "text-pos-foreground dark:text-pos-foreground-dark",
    destructive: "text-pos-primary-foreground",
};

export const PosButton = ({
    label,
    onPress,
    disabled,
    loading,
    variant = "primary",
    icon,
}: PosButtonProps) => {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            className={`min-h-12 items-center justify-center rounded-2xl px-4 ${buttonVariantClasses[variant]} ${
                isDisabled ? "opacity-60" : "active:opacity-90"
            }`}
            disabled={isDisabled}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
        >
            {loading ? (
                <ActivityIndicator color={variant === "secondary" ? undefined : "white"} />
            ) : (
                <View className="flex-row items-center gap-2">
                    {icon}
                    <Text className={`text-base font-semibold ${buttonTextClasses[variant]}`}>{label}</Text>
                </View>
            )}
        </Pressable>
    );
};

type PosTextFieldProps = Pick<
    TextInputProps,
    "value" | "onChangeText" | "placeholder" | "keyboardType" | "autoCapitalize" | "secureTextEntry"
> & {
    label: string;
    error?: string;
    required?: boolean;
};

export const PosTextField = ({ label, error, required, ...inputProps }: PosTextFieldProps) => {
    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-pos-foreground dark:text-pos-foreground-dark">
                {label}
                {required ? <Text className="text-pos-warning dark:text-pos-warning-dark"> *</Text> : null}
            </Text>
            <TextInput
                className={`min-h-12 rounded-2xl border bg-pos-surface px-4 text-base text-pos-foreground dark:border-pos-border-dark dark:bg-pos-surface-dark dark:text-pos-foreground-dark ${
                    error ? "border-pos-danger dark:border-pos-danger-dark" : "border-pos-border"
                }`}
                {...inputProps}
            />
            {error ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{error}</Text> : null}
        </View>
    );
};

export const PosCard = ({ children }: { children: ReactNode }) => (
    <View className="gap-3 rounded-3xl border border-pos-border bg-pos-surface p-5 dark:border-pos-border-dark dark:bg-pos-surface-dark">
        {children}
    </View>
);

const statusToneClasses: Record<PosStatusTone, string> = {
    neutral: "border-pos-border bg-pos-surface-muted text-pos-muted dark:border-pos-border-dark dark:bg-pos-surface-muted-dark dark:text-pos-muted-dark",
    success: "border-pos-success/20 bg-pos-success/10 text-pos-success dark:border-pos-success-dark/20 dark:bg-pos-success-dark/10 dark:text-pos-success-dark",
    warning: "border-pos-warning/20 bg-pos-warning/10 text-pos-warning dark:border-pos-warning-dark/20 dark:bg-pos-warning-dark/10 dark:text-pos-warning-dark",
    danger: "border-pos-danger/20 bg-pos-danger/10 text-pos-danger dark:border-pos-danger-dark/20 dark:bg-pos-danger-dark/10 dark:text-pos-danger-dark",
};

export const PosStatusBadge = ({ label, tone = "neutral" }: { label: string; tone?: PosStatusTone }) => (
    <View className={`self-start rounded-full border px-3 py-1 ${statusToneClasses[tone]}`}>
        <Text className="text-xs font-semibold">{label}</Text>
    </View>
);
