import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import PosLoginPage from "@/pages/pos-login-page";
import PosPage from "@/pages/pos-page";
import PosBillsPage from "@/pages/pos-bills-page";
import PosProductsPage from "@/pages/pos-products-page";
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
                        <Route path="bills" element={<PosBillsPage />} />
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
