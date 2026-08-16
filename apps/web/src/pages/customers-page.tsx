import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";

import CustomerDirectory from "@/components/customers/customer-directory";

const CustomersPage = () => {
    const { organizationId = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const organizationQuery = useQuery({
        queryKey: ["organization", organizationId, "details"],
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });
    const stores = organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization.stores ?? [] : [];
    const requestedStoreId = searchParams.get("storeId");
    const selectedStoreId = stores.some(store => store.id === requestedStoreId)
        ? requestedStoreId!
        : stores[0]?.id || "";

    return (
        <div className="space-y-4">
            {stores.length > 0 ? (
                <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">Store</span>
                    <Select value={selectedStoreId} onValueChange={value => setSearchParams({ storeId: value })}>
                        <SelectTrigger className="w-full max-w-xs rounded-xl"><SelectValue placeholder="Select Store" /></SelectTrigger>
                        <SelectContent>{stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            ) : null}
            <CustomerDirectory mode="admin" organizationId={organizationId} storeId={selectedStoreId || undefined} />
        </div>
    );
};

export default CustomersPage;
