import { ActivityIndicator, View } from "react-native";

const LoadingScreen = () => {
    return (
        <View className="flex-1 items-center justify-center bg-stone-100">
            <ActivityIndicator size="large" color="#92400e" />
        </View>
    );
};

export default LoadingScreen;
