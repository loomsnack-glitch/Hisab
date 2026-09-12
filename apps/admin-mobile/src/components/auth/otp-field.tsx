import { useEffect, useRef } from "react";
import { Text, TextInput, View } from "react-native";

type OtpFieldProps = {
    value: string;
    onChangeText: (value: string) => void;
    error?: string;
    hint?: string;
    autoFocus?: boolean;
    disabled?: boolean;
};

const OtpField = ({
    value,
    onChangeText,
    error,
    hint = "Enter the 6-digit code sent on WhatsApp.",
    autoFocus = true,
    disabled = false,
}: OtpFieldProps) => {
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!autoFocus) return undefined;

        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, [autoFocus]);

    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">Verification code</Text>
            <TextInput
                ref={inputRef}
                className={`min-h-14 rounded-2xl border bg-admin-surface px-4 text-center text-2xl tracking-[8px] text-admin-foreground dark:bg-admin-surface-dark dark:text-admin-foreground-dark ${
                    error ? "border-admin-danger" : "border-admin-border dark:border-admin-border-dark"
                } ${disabled ? "opacity-60" : ""}`}
                value={value}
                onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#cbd5e1"
                autoFocus={autoFocus}
                editable={!disabled}
                accessibilityLabel="Six digit verification code"
            />
            {hint ? <Text className="text-center text-sm leading-5 text-admin-muted dark:text-admin-muted-dark">{hint}</Text> : null}
            {error ? <Text className="text-center text-sm leading-5 text-admin-danger">{error}</Text> : null}
        </View>
    );
};

export default OtpField;
