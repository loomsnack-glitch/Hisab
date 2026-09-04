import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import PrimaryButton from "../components/primary-button";

type LoadingScreenProps = {
    message?: string;
    onRetry?: () => void;
};

const LoadingScreen = ({ message, onRetry }: LoadingScreenProps) => {
    const { t } = useTranslation();

    return (
        <View className="flex-1 items-center justify-center gap-4 bg-pos-background px-6 dark:bg-pos-background-dark">
            <ActivityIndicator size="large" />
            {message ? <Text className="text-center text-sm text-pos-muted dark:text-pos-muted-dark">{message}</Text> : null}
            {onRetry ? <PrimaryButton label={t("retry")} onPress={onRetry} /> : null}
        </View>
    );
};

export default LoadingScreen;
