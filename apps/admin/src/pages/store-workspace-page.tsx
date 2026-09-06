import { Navigate, useParams } from "react-router-dom";

import { getStoreProductsPath } from "@/lib/store-workspace-routes";

const StoreWorkspacePage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    return <Navigate to={getStoreProductsPath(organizationId, storeId)} replace />;
};

export default StoreWorkspacePage;
