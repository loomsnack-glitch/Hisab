import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosTranslationKey } from "../lib/localization-boundary";
import type { PosStackParamList } from "../navigation/pos-navigator";

type DestinationName = Exclude<keyof PosStackParamList, "PosHome">;
type PosDestinationScreenProps = NativeStackScreenProps<PosStackParamList, DestinationName>;

const destinationLabels: Record<DestinationName, PosTranslationKey> = {
    NewSale: "newSale",
    Bills: "bills",
    Customers: "customers",
    Reports: "reports",
    Settings: "settings",
    Tables: "tables",
};

const PosDestinationScreen = ({ navigation, route }: PosDestinationScreenProps) => {
    const { t } = useTranslation("pos");
    const label = t(destinationLabels[route.name]);

    return (
        <View className="flex-1 bg-pos-background px-5 py-6 dark:bg-pos-background-dark">
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{label}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("comingSoon")}</Text>
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </View>
    );
};

export default PosDestinationScreen;
