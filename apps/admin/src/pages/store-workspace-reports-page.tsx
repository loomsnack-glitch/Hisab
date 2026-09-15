import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import ProductSalesSummary from "@/components/reports/product-sales-summary";

const StoreWorkspaceReportsPage = () => (
    <StoreWorkspacePageGate testId="store-reports-page">
        {({ organizationId, storeId, store }) => (
            <ProductSalesSummary
                mode="admin"
                organizationId={organizationId}
                stores={[{ id: store.id, name: store.name }]}
                fixedStoreId={storeId}
            />
        )}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceReportsPage;
