import PosDeviceSidebar from "@/components/pos/pos-device-sidebar";
import UnderDevelopment from "@/components/under-development";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";

const PosTablesPage = () => {
  if (!isTableServiceReady) {
    return (
      <div
        className="flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] flex-col max-lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden lg:flex-row"
        data-testid="pos-tables-page"
      >
        <PosDeviceSidebar activePanelTab="tables" />
        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-8 lg:p-6">
          <UnderDevelopment title="Tables is under development" message={tableServiceUnavailableMessage} />
        </section>
      </div>
    );
  }

  return <PosTablesWorkspace />;
};

export default PosTablesPage;
