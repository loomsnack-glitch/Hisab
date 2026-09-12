import { Pressable, Text } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

const ThemeToggle = () => {
    const { theme } = useUniwind();
    const isDark = theme === "dark";

    return (
        <Pressable
            className="min-h-10 flex-row items-center justify-center rounded-xl border border-admin-border bg-admin-surface px-3 dark:border-admin-border-dark dark:bg-admin-surface-dark"
            onPress={() => Uniwind.setTheme(isDark ? "light" : "dark")}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDark }}
            accessibilityLabel="Toggle dark mode"
        >
            <Text className="text-sm font-semibold text-admin-foreground dark:text-admin-foreground-dark">
                {isDark ? "☀️ Light" : "🌙 Dark"}
            </Text>
        </Pressable>
    );
};

export default ThemeToggle;
