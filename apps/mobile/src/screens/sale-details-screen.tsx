import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";

type SaleDetailsScreenProps = NativeStackScreenProps<PosStackParamList, "SaleDetails">;

const SaleDetailsScreen = ({ navigation }: SaleDetailsScreenProps) => {
    const { t } = useTranslation("pos");

    return (
        <View className="flex-1 bg-pos-background px-5 py-6 dark:bg-pos-background-dark">
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleDetails")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("saleDetailsComingSoon")}</Text>
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </View>
    );
};

export default SaleDetailsScreen;
