import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const OTP_LENGTH = 6;

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
    hint,
    autoFocus = true,
    disabled = false,
}: OtpFieldProps) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!autoFocus) return undefined;

        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, [autoFocus]);

    const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");
    const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

    const focusInput = () => {
        if (!disabled) {
            inputRef.current?.focus();
        }
    };

    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">Verification code</Text>
            <Pressable
                className={`relative flex-row gap-2 ${disabled ? "opacity-60" : ""}`}
                onPress={focusInput}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Enter six digit verification code"
            >
                {digits.map((digit, index) => {
                    const isActive = isFocused && index === activeIndex;
                    const boxState = error
                        ? "border-admin-danger bg-admin-danger-surface dark:bg-admin-danger/10"
                        : isActive
                          ? "border-admin-primary bg-admin-info-surface dark:bg-admin-info-surface-dark"
                          : digit
                            ? "border-admin-primary/50 bg-admin-info-surface dark:bg-admin-info-surface-dark"
                            : "border-admin-border bg-admin-surface dark:border-admin-border-dark dark:bg-admin-surface-dark";

                    return (
                        <View
                            key={index}
                            className={`h-14 max-w-14 flex-1 items-center justify-center rounded-2xl border-2 ${boxState}`}
                        >
                            {digit ? (
                                <Text className="text-2xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                                    {digit}
                                </Text>
                            ) : isActive ? (
                                <View className="h-7 w-0.5 rounded-full bg-admin-primary" />
                            ) : null}
                        </View>
                    );
                })}
                <TextInput
                    ref={inputRef}
                    className="absolute inset-0 opacity-0"
                    value={value}
                    onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    autoFocus={autoFocus}
                    editable={!disabled}
                    caretHidden
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    importantForAutofill="yes"
                    accessibilityLabel="Six digit verification code"
                />
            </Pressable>
            {hint ? <Text className="text-center text-sm leading-5 text-admin-muted dark:text-admin-muted-dark">{hint}</Text> : null}
            {error ? <Text className="text-center text-sm leading-5 text-admin-danger">{error}</Text> : null}
        </View>
    );
};

export default OtpField;
