import { Pressable, Text, View } from "react-native";

export type AuthPreviewMode = "login" | "register";

type AuthPreviewSwitcherProps = {
    mode: AuthPreviewMode;
    onChange: (mode: AuthPreviewMode) => void;
};

const AuthPreviewSwitcher = ({ mode, onChange }: AuthPreviewSwitcherProps) => (
    <View className="mb-5 flex-row rounded-2xl border border-admin-border bg-admin-background p-1 dark:border-admin-border-dark dark:bg-admin-background-dark">
        {(["login", "register"] as const).map((option) => (
            <Pressable
                key={option}
                className={`flex-1 items-center rounded-xl px-3 py-2.5 ${option === mode ? "bg-admin-surface shadow-sm dark:bg-admin-surface-dark" : ""}`}
                onPress={() => onChange(option)}
                accessibilityRole="tab"
                accessibilityState={{ selected: option === mode }}
            >
                <Text
                    className={`text-sm font-semibold ${
                        option === mode
                            ? "text-admin-foreground dark:text-admin-foreground-dark"
                            : "text-admin-muted dark:text-admin-muted-dark"
                    }`}
                >
                    {option === "login" ? "Sign in" : "Register"}
                </Text>
            </Pressable>
        ))}
    </View>
);

export default AuthPreviewSwitcher;
