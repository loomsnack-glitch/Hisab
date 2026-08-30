import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userAuthenticate } from "@repo/services";
import SplashLoader from "@repo/ui/components/loaders/splash-loader";

import DashboardLayout from "@/components/dashboard/dashboard-layout";
import BillingPage from "@/pages/billing-page";
import PurchasesPage from "@/pages/purchases-page";
import LoginPage from "@/pages/login-page";
import OrganizationsPage from "@/pages/organizations-page";
import RegisterPage from "@/pages/register-page";
import StoresPage from "@/pages/stores-page";
import {
    StoreDetailIndexRedirect,
    StoreDetailShell,
    StoreDevicesPage,
    StoreSettingsPage,
} from "@/pages/store-detail-page";
import ProductsPage from "@/pages/products-page";
import ProductsListPage from "@/pages/products-list-page";
import CategoriesPage from "@/pages/categories-page";
import CustomersPage from "@/pages/customers-page";
import AddOnsPage from "@/pages/add-ons-page";
import LabelTemplatesPage from "@/pages/label-templates-page";
import LandingPage from "@/pages/landing-page";
import ReportsPage from "@/pages/reports-page";
import AppearancePage from "@/pages/appearance-page";
import TablesPage from "@/pages/tables-page";
import WhatsAppAccountPage from "@/pages/whatsapp-account-page";
import WhatsAppOrganizationPage from "@/pages/whatsapp-organization-page";
import RetiredPosRoutePage from "@/pages/retired-pos-route-page";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";
import WebAppHead from "@/components/web-app-head";
import { DisplayScaleProvider } from "@/providers/display-scale-provider";
import { getDocumentTitle } from "@/lib/app-identity";

const SPLASH_DURATION_MS = 2200;

const WhatsAppStoreInboxRedirect = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const query = new URLSearchParams({ storeId });
    return <Navigate to={`/organizations/${organizationId}/whatsapp/message-history?${query.toString()}`} replace />;
};

const WhatsAppInboxWorkspaceRedirect = () => {
    const { organizationId = "" } = useParams();
    return <Navigate to={`/organizations/${organizationId}/whatsapp/message-history`} replace />;
};

const App = () => {
    const location = useLocation();
    const authUser = useAuthUser();
    const { clearUser, setUser } = useAuthActions();
    const [showSplash, setShowSplash] = useState(false);
    const hadAuthUserRef = useRef(false);

    useEffect(() => {
        document.title = getDocumentTitle();
    }, [location.pathname]);

    const authQuery = useQuery({
        queryKey: authKeys.me,
        queryFn: userAuthenticate,
        retry: false,
    });

    useEffect(() => {
        if (authQuery.data?.status === "success" && authQuery.data.data?.user) {
            setUser(authQuery.data.data.user);
            return;
        }

        if (authQuery.data?.status === "error" || authQuery.isError) {
            clearUser();
        }
    }, [authQuery.data, authQuery.isError, clearUser, setUser]);

    useEffect(() => {
        if (!authUser) {
            hadAuthUserRef.current = false;
            setShowSplash(false);
            return;
        }

        if (!hadAuthUserRef.current) {
            hadAuthUserRef.current = true;
            setShowSplash(true);
        }
    }, [authUser]);

    const authenticatedUser =
        authUser ??
        (authQuery.data?.status === "success" ? authQuery.data.data?.user ?? null : null);

    return (
        <DisplayScaleProvider scope="admin">
            <WebAppHead />
            <div data-workspace="admin">
                {authQuery.isPending ? (
                    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading" />
                ) : (
                    <>
                        <Routes>
                            <Route path="/" element={authenticatedUser ? <Navigate to="/organizations" replace /> : <LandingPage />} />
                            <Route path="/login" element={authenticatedUser ? <Navigate to="/organizations" replace /> : <LoginPage />} />
                            <Route
                                path="/register"
                                element={authenticatedUser ? <Navigate to="/organizations" replace /> : <RegisterPage />}
                            />
                            <Route path="/pos" element={<RetiredPosRoutePage />} />
                            <Route path="/pos/*" element={<RetiredPosRoutePage />} />
                            <Route
                                element={authenticatedUser ? <DashboardLayout /> : <Navigate to="/login" replace />}
                            >
                                <Route path="/dashboard" element={<Navigate to="/organizations" replace />} />
                                <Route path="/appearance" element={<AppearancePage />} />
                                <Route path="/settings" element={<Navigate to="/appearance" replace />} />
                                <Route path="/organizations" element={<OrganizationsPage />} />
                                <Route path="/organizations/:organizationId" element={<Navigate to="stores" replace />} />
                                <Route path="/organizations/:organizationId/stores" element={<StoresPage />} />
                                <Route path="/organizations/:organizationId/stores/:storeId" element={<StoreDetailShell />}>
                                    <Route index element={<StoreDetailIndexRedirect />} />
                                    <Route path="devices" element={<StoreDevicesPage />} />
                                    <Route path="settings" element={<StoreSettingsPage />} />
                                </Route>
                                <Route path="/organizations/:organizationId/products" element={<ProductsPage />}>
                                    <Route index element={<Navigate to="list" replace />} />
                                    <Route path="list" element={<ProductsListPage />} />
                                    <Route path="categories" element={<CategoriesPage />} />
                                    <Route path="add-ons" element={<AddOnsPage />} />
                                    <Route path="label-templates" element={<LabelTemplatesPage />} />
                                </Route>
                                <Route path="/organizations/:organizationId/billing" element={<BillingPage />} />
                                <Route path="/organizations/:organizationId/reports" element={<ReportsPage />} />
                                <Route path="/organizations/:organizationId/customers" element={<CustomersPage />} />
                                <Route path="/organizations/:organizationId/purchases" element={<PurchasesPage />} />
                                <Route path="/organizations/:organizationId/tables" element={<TablesPage />} />
                                <Route path="/organizations/:organizationId/whatsapp" element={<Navigate to="accounts" replace />} />
                                <Route path="/organizations/:organizationId/whatsapp/accounts" element={<WhatsAppOrganizationPage />} />
                                <Route path="/organizations/:organizationId/whatsapp/templates" element={<WhatsAppOrganizationPage />} />
                                <Route path="/organizations/:organizationId/whatsapp/links" element={<Navigate to="../templates" replace />} />
                                <Route path="/organizations/:organizationId/whatsapp/delivery" element={<Navigate to="../accounts" replace />} />
                                <Route path="/organizations/:organizationId/whatsapp/promotions" element={<WhatsAppOrganizationPage />} />
                                <Route path="/organizations/:organizationId/whatsapp/message-history" element={<WhatsAppOrganizationPage />} />
                                <Route path="/organizations/:organizationId/whatsapp/inbox" element={<WhatsAppInboxWorkspaceRedirect />} />
                                <Route path="/organizations/:organizationId/stores/:storeId/whatsapp" element={<WhatsAppAccountPage />} />
                                <Route path="/organizations/:organizationId/stores/:storeId/whatsapp/inbox" element={<WhatsAppStoreInboxRedirect />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>

                        {showSplash && authUser ? (
                            <SplashLoader durationMs={SPLASH_DURATION_MS} onComplete={() => setShowSplash(false)} />
                        ) : null}
                    </>
                )}
            </div>
        </DisplayScaleProvider>
    );
};

export default App;
