import UnderDevelopment from "@/components/under-development";
import { isTableServiceReady, tableServiceUnavailableMessage } from "@/lib/table-service-availability";
import PosTablesWorkspace from "@/pages/pos-tables-workspace";

const panelMaxHeight =
  "calc(100dvh - var(--pos-header-height, 3.5rem) - env(safe-area-inset-top, 0px) - var(--pos-mobile-nav-height, 0px))";

const PosTablesPage = () => {
  if (!isTableServiceReady) {
    return (
      <div
        className="flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] flex-col max-lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden"
        data-testid="pos-tables-page"
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-[pan-y_pinch-zoom] p-4 max-lg:pb-2 lg:p-6"
          style={{ maxHeight: panelMaxHeight }}
        >
          <UnderDevelopment title="Tables is under development" message={tableServiceUnavailableMessage} />
        </div>
      </div>
    );
  }

  return <PosTablesWorkspace />;
};

export default PosTablesPage;
