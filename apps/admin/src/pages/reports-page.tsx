import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Spinner } from "@repo/ui/components/spinner";

import ProductSalesSummary from "@/components/reports/product-sales-summary";
import { organizationKeys } from "@/lib/query-keys";

const ReportsPage = () => {
    const { organizationId = "" } = useParams();
    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });
    const organization =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization
            : null;
    const stores = (organization?.stores ?? []).map((store) => ({
        id: store.id,
        name: store.name,
    }));

    return (
        <div className="min-w-0" data-testid="reports-page">
            {organizationQuery.isPending ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : (
                <ProductSalesSummary
                    mode="admin"
                    organizationId={organizationId}
                    stores={stores}
                />
            )}
        </div>
    );
};

export default ReportsPage;
