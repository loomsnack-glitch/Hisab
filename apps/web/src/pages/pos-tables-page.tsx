import PosDeviceSidebar from "@/components/pos/pos-device-sidebar";
import UnderDevelopment from "@/components/under-development";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";

const PosTablesPage = () => {
  if (!isTableServiceReady) {
    return (
      <div className="flex min-h-full flex-col lg:flex-row" data-testid="pos-tables-page">
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
