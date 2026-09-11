import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FoundationScreen = () => (
    <SafeAreaView className="flex-1 bg-admin-background dark:bg-admin-background-dark">
        <View className="flex-1 items-center justify-center px-6">
            <Text className="text-3xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                Ganatri Admin
            </Text>
            <Text className="mt-3 text-center text-base text-admin-muted dark:text-admin-muted-dark">
                Admin mobile foundation ready.
            </Text>
        </View>
    </SafeAreaView>
);

export default FoundationScreen;
