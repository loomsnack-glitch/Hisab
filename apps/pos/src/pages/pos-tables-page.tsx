import { useOutletContext } from "react-router-dom";

import ServiceDisabled from "@/components/service-disabled";
import UnderDevelopment from "@/components/under-development";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosTablesPage = () => {
  const { session } = useOutletContext<PosRouteContext>();

  if (!session.store.tableManagementEnabled) {
    return (
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))]"
        data-testid="pos-tables-page"
      >
        <div className="min-h-0 flex-1 touch-[pan-y_pinch-zoom] overflow-y-auto overscroll-contain p-4 lg:p-6">
          <ServiceDisabled
            title="Tables"
            message="Table management is disabled for this store."
          />
        </div>
      </div>
    );
  }

  if (!isTableServiceReady) {
    return (
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))]"
        data-testid="pos-tables-page"
      >
        <div className="min-h-0 flex-1 touch-[pan-y_pinch-zoom] overflow-y-auto overscroll-contain p-4 lg:p-6">
          <UnderDevelopment title="Tables is under development" message={tableServiceUnavailableMessage} />
        </div>
      </div>
    );
  }

  return <PosTablesWorkspace />;
};

export default PosTablesPage;
