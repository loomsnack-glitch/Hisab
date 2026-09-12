import { Text, View } from "react-native";
import AuthShell from "../components/auth/auth-shell";

const FoundationScreen = () => (
    <AuthShell
        title="Welcome to Ganatri Admin"
        subtitle="A native authentication experience for managing your organization."
        stepLabel="Auth UI preview"
        currentStep={1}
        totalSteps={4}
    >
        <View className="gap-2">
            <Text className="text-base font-semibold text-admin-foreground dark:text-admin-foreground-dark">
                Authentication foundation ready
            </Text>
            <Text className="text-sm leading-5 text-admin-muted dark:text-admin-muted-dark">
                Login and registration controls will be added in the next UI subphase.
            </Text>
        </View>
    </AuthShell>
);

export default FoundationScreen;
