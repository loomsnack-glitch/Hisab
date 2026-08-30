import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import PosLoginPage from "@/pages/pos-login-page";
import PosPage from "@/pages/pos-page";
import PosBillsPage from "@/pages/pos-bills-page";
import PosProductsPage from "@/pages/pos-products-page";
import PosTablesPage from "@/pages/pos-tables-page";
import PosCustomersPage from "@/pages/pos-customers-page";
import PosReportsPage from "@/pages/pos-reports-page";
import PosPurchasesPage from "@/pages/pos-purchases-page";
import PosKotsPage from "@/pages/pos-kots-page";
import PosAppearancePage from "@/pages/pos-appearance-page";
import WebAppHead from "@/components/web-app-head";
import { DisplayScaleProvider } from "@/providers/display-scale-provider";
import { getDocumentTitle } from "@/lib/app-identity";

const App = () => {
    const location = useLocation();

    useEffect(() => {
        document.title = getDocumentTitle();
    }, [location.pathname]);

    return (
        <DisplayScaleProvider scope="pos">
            <WebAppHead />
            <div data-workspace="pos">
                <Routes>
                    <Route path="/login" element={<PosLoginPage />} />
                    <Route path="/" element={<PosPage />}>
                        <Route index element={<PosProductsPage />} />
                        <Route path="tables" element={<PosTablesPage />} />
                        <Route path="customers" element={<PosCustomersPage />} />
                        <Route path="reports" element={<PosReportsPage />} />
                        <Route path="purchases" element={<PosPurchasesPage />} />
                        <Route path="whatsapp" element={<Navigate to="/" replace />} />
                        <Route path="bills" element={<PosBillsPage />} />
                        <Route path="kots" element={<PosKotsPage />} />
                        <Route path="appearance" element={<PosAppearancePage />} />
                        <Route path="settings" element={<Navigate to="/appearance" replace />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </DisplayScaleProvider>
    );
};

export default App;
