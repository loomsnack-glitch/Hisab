import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SessionStatusScreenProps = {
    title: string;
    subtitle: string;
    loading?: boolean;
};

const SessionStatusScreen = ({ title, subtitle, loading = false }: SessionStatusScreenProps) => (
    <SafeAreaView className="flex-1 bg-admin-background dark:bg-admin-background-dark">
        <View className="flex-1 items-center justify-center px-6">
            <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-admin-primary">
                {loading ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text className="text-2xl font-bold text-admin-primary-foreground">G</Text>
                )}
            </View>
            <Text className="text-center text-2xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                {title}
            </Text>
            <Text className="mt-2 max-w-sm text-center text-base leading-6 text-admin-muted dark:text-admin-muted-dark">
                {subtitle}
            </Text>
        </View>
    </SafeAreaView>
);

export default SessionStatusScreen;
