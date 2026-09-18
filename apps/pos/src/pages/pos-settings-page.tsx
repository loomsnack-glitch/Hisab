import GeneralSettingsSection from "@/components/settings/general-settings-section";
import {
  posSettingsPageContentClassName,
  posSettingsPageShellClassName,
} from "@/lib/pos-settings-page-layout";

const PosSettingsPage = () => {
  return (
    <div className={posSettingsPageShellClassName}>
      <div className={posSettingsPageContentClassName}>
        <GeneralSettingsSection />
      </div>
    </div>
  );
};

export default PosSettingsPage;
