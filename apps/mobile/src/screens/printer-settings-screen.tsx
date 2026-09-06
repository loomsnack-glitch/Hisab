import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import { usePosPrinter } from "../hooks/use-pos-printer";
import type { PosPrinterStatus } from "../lib/pos-printer-boundary";
import type { PosStackParamList } from "../navigation/pos-navigator";

type PrinterSettingsScreenProps = NativeStackScreenProps<PosStackParamList, "PrinterSettings">;

const statusKey: Record<PosPrinterStatus, "printerDisconnected" | "printerDiscovering" | "printerConnecting" | "printerConnected" | "printerTesting" | "printerPrinting" | "printerFailed"> = {
    disconnected: "printerDisconnected",
    discovering: "printerDiscovering",
    connecting: "printerConnecting",
    connected: "printerConnected",
    testing: "printerTesting",
    printing: "printerPrinting",
    failed: "printerFailed",
};

const PrinterSettingsScreen = ({ navigation }: PrinterSettingsScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const printer = usePosPrinter();
    const busy = ["discovering", "connecting", "testing", "printing"].includes(printer.status);

    return (
        <ScrollView className="flex-1 bg-pos-background dark:bg-pos-background-dark" contentContainerClassName="gap-5 px-5 py-6" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
            <View className="gap-1">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("printerSettings")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("printerSettingsSubtitle")}</Text>
            </View>
            <PosCard>
                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t(statusKey[printer.status])}</Text>
                {printer.selected ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("selectedPrinter")}: {printer.selected.name}</Text> : null}
                {printer.message ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{printer.message}</Text> : null}
                <PosButton label={t("discoverPrinters")} variant="secondary" loading={printer.status === "discovering"} disabled={busy} onPress={() => { void printer.discover(); }} />
                {printer.devices.map((device) => <PosButton key={device.id} label={`${device.name}${printer.selected?.id === device.id ? ` — ${t("selectedPrinter")}` : ""}`} variant={printer.selected?.id === device.id ? "primary" : "secondary"} accessibilityState={{ selected: printer.selected?.id === device.id }} onPress={() => printer.select(device)} />)}
                <PosButton label={t("connectPrinter")} loading={printer.status === "connecting"} disabled={!printer.selected || busy} onPress={() => { void printer.connect(); }} />
                <PosButton label={t("disconnectPrinter")} variant="secondary" disabled={!printer.selected || busy || printer.status !== "connected"} onPress={() => { void printer.disconnect(); }} />
                <PosButton label={t("testPrint")} variant="secondary" loading={printer.status === "testing"} disabled={!printer.selected || busy || printer.status !== "connected"} onPress={() => { void printer.testPrint(); }} />
                {printer.status === "failed" ? <PosButton label={t("retryPrinter")} variant="secondary" onPress={() => { void printer.retry(); }} /> : null}
            </PosCard>
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default PrinterSettingsScreen;
