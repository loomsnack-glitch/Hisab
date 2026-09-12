import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

type AuthFieldProps = Omit<TextInputProps, "secureTextEntry"> & {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    secureTextEntry?: boolean;
};

const AuthField = forwardRef<TextInput, AuthFieldProps>(
    ({ label, error, hint, required, secureTextEntry = false, ...inputProps }, ref) => {
        const [isVisible, setIsVisible] = useState(false);

        return (
            <View className="gap-2">
                <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">
                    {label}
                    {required ? <Text className="text-admin-danger"> *</Text> : null}
                </Text>
                <View
                    className={`min-h-12 flex-row items-center rounded-2xl border bg-admin-surface px-4 dark:bg-admin-surface-dark ${
                        error ? "border-admin-danger" : "border-admin-border dark:border-admin-border-dark"
                    }`}
                >
                    <TextInput
                        ref={ref}
                        className="min-h-12 flex-1 py-2 text-base text-admin-foreground dark:text-admin-foreground-dark"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={secureTextEntry && !isVisible}
                        {...inputProps}
                    />
                    {secureTextEntry ? (
                        <Pressable
                            className="ml-3 min-h-10 justify-center pl-2"
                            onPress={() => setIsVisible((visible) => !visible)}
                            accessibilityRole="button"
                            accessibilityLabel={isVisible ? "Hide password" : "Show password"}
                        >
                            <Text className="text-sm font-semibold text-admin-primary">{isVisible ? "Hide" : "Show"}</Text>
                        </Pressable>
                    ) : null}
                </View>
                {hint && !error ? (
                    <Text className="text-sm leading-5 text-admin-muted dark:text-admin-muted-dark">{hint}</Text>
                ) : null}
                {error ? <Text className="text-sm leading-5 text-admin-danger">{error}</Text> : null}
            </View>
        );
    },
);

AuthField.displayName = "AuthField";

export default AuthField;
