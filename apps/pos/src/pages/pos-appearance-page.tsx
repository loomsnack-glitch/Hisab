import AppearanceSettingsSection from "@/components/settings/appearance-settings-section";
import {
    posSettingsPageContentClassName,
    posSettingsPageShellClassName,
} from "@/lib/pos-settings-page-layout";

const PosAppearancePage = () => {
    return (
        <div className={posSettingsPageShellClassName}>
            <div className={posSettingsPageContentClassName}>
                <AppearanceSettingsSection />
            </div>
        </div>
    );
};

export default PosAppearancePage;
