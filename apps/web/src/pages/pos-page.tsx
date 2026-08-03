import { useCallback, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { deviceAuthenticate } from "@repo/services";
import { Spinner } from "@repo/ui/components/spinner";

import PosLayout from "@/components/pos/pos-layout";
import { deviceAuthKeys } from "@/lib/query-keys";
import BillingPage from "@/pages/billing-page";

const PosPage = () => {
  const [searchParams] = useSearchParams();
  const initialPanel = searchParams.get("panel");
  const [headerSearch, setHeaderSearch] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<"products" | "bills" | "customers" | "purchases">(
    initialPanel === "bills" || initialPanel === "customers" || initialPanel === "purchases" ? initialPanel : "products",
  );
  const handlePanelTabChange = useCallback((tab: "products" | "bills" | "customers" | "purchases") => {
    setActivePanelTab(tab);
    setHeaderSearch("");
  }, []);
    const deviceAuthQuery = useQuery({
        queryKey: deviceAuthKeys.me,
        queryFn: deviceAuthenticate,
        retry: false,
    });

    const session =
        deviceAuthQuery.data?.status === "success"
      ? (deviceAuthQuery.data.data?.session ?? null)
            : null;

    if (deviceAuthQuery.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

  if (
    deviceAuthQuery.isError ||
    deviceAuthQuery.data?.status === "error" ||
    !session
  ) {
        return <Navigate to="/pos/login" replace />;
    }

    return (
    <PosLayout
      session={session}
      searchValue={headerSearch}
      searchPlaceholder={
        activePanelTab === "products"
          ? "Search products..."
          : activePanelTab === "bills"
            ? "Search bills..."
            : activePanelTab === "customers"
              ? "Search customers..."
            : "Search purchases..."
      }
      onSearchChange={setHeaderSearch}
    >
      <BillingPage
        mode="device"
        session={session}
        initialPanelTab={activePanelTab}
        productSearch={activePanelTab === "products" ? headerSearch : ""}
        salesSearch={activePanelTab === "bills" ? headerSearch : ""}
        purchaseSearch={activePanelTab === "purchases" ? headerSearch : ""}
        customerSearch={activePanelTab === "customers" ? headerSearch : ""}
        onCustomerSearchChange={setHeaderSearch}
        onPanelTabChange={handlePanelTabChange}
      />
        </PosLayout>
    );
};

export default PosPage;
