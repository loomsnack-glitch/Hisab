import { useOutletContext } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";

import ServiceDisabled from "@/components/service-disabled";
import UnderDevelopment from "@/components/under-development";
import { posTablesPageClassName, posTablesScrollerClassName } from "@/lib/pos-service-table";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosTablesPage = () => {
  const { session } = useOutletContext<PosRouteContext>();

  if (!session.store.tableManagementEnabled) {
    return (
      <div className={posTablesPageClassName} data-testid="pos-tables-page">
        <div className={cn(posTablesScrollerClassName, "p-4 lg:p-6")} data-testid="pos-tables-scroller">
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
      <div className={posTablesPageClassName} data-testid="pos-tables-page">
        <div className={cn(posTablesScrollerClassName, "p-4 lg:p-6")} data-testid="pos-tables-scroller">
          <UnderDevelopment title="Tables is under development" message={tableServiceUnavailableMessage} />
        </div>
      </div>
    );
  }

  return <PosTablesWorkspace />;
};

export default PosTablesPage;
