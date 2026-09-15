import PrinterSettingsSection from "@/components/settings/printer-settings-section";
import {
    posSettingsPageContentClassName,
    posSettingsPageShellClassName,
} from "@/lib/pos-settings-page-layout";

const PosPrinterPage = () => {
    return (
        <div className={posSettingsPageShellClassName}>
            <div className={posSettingsPageContentClassName}>
                <PrinterSettingsSection />
            </div>
        </div>
    );
};

export default PosPrinterPage;
