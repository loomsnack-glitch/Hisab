import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userAuthenticate } from "@repo/services";
import SplashLoader from "@repo/ui/components/loaders/splash-loader";

import DashboardLayout from "@/components/dashboard/dashboard-layout";
import BillingPage from "@/pages/billing-page";
import PurchasesPage from "@/pages/purchases-page";
import LoginPage from "@/pages/login-page";
import OrganizationsPage from "@/pages/organizations-page";
import PosLoginPage from "@/pages/pos-login-page";
import PosPage from "@/pages/pos-page";
import PosBillsPage from "@/pages/pos-bills-page";
import PosCustomersPage from "@/pages/pos-customers-page";
import PosProductsPage from "@/pages/pos-products-page";
import PosPurchasesPage from "@/pages/pos-purchases-page";
import RegisterPage from "@/pages/register-page";
import StoresPage from "@/pages/stores-page";
import ProductsPage from "@/pages/products-page";
import ProductsListPage from "@/pages/products-list-page";
import CategoriesPage from "@/pages/categories-page";
import CustomersPage from "@/pages/customers-page";
import AddOnsPage from "@/pages/add-ons-page";
import LabelTemplatesPage from "@/pages/label-templates-page";
import LandingPage from "@/pages/landing-page";
import ReportsPage from "@/pages/reports-page";
import PosReportsPage from "@/pages/pos-reports-page";
import WhatsAppAccountPage from "@/pages/whatsapp-account-page";
import WhatsAppInboxPage, { PosWhatsAppInboxPage } from "@/pages/whatsapp-inbox-page";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";
import { DisplayScaleProvider } from "@/providers/display-scale-provider";
import type { DisplayScaleScope } from "@/lib/display-scale";

const SPLASH_DURATION_MS = 2200;

const App = () => {
    const location = useLocation();
    const authUser = useAuthUser();
    const { clearUser, setUser } = useAuthActions();
    const [showSplash, setShowSplash] = useState(false);
    const hadAuthUserRef = useRef(false);
    const isPosRoute = location.pathname.startsWith("/pos");

    useEffect(() => {
        document.title = isPosRoute ? "Ganatri POS" : location.pathname === "/" ? "Ganatri" : "Ganatri Admin";
    }, [isPosRoute, location.pathname]);

    const authQuery = useQuery({
        queryKey: authKeys.me,
        queryFn: userAuthenticate,
        enabled: !isPosRoute,
        retry: false,
    });

    useEffect(() => {
        if (isPosRoute) {
            return;
        }

        if (authQuery.data?.status === "success" && authQuery.data.data?.user) {
            setUser(authQuery.data.data.user);
            return;
        }

        if (authQuery.data?.status === "error" || authQuery.isError) {
            clearUser();
        }
    }, [authQuery.data, authQuery.isError, clearUser, setUser]);

    useEffect(() => {
        if (isPosRoute) {
            return;
        }

        if (!authUser) {
            hadAuthUserRef.current = false;
            setShowSplash(false);
            return;
        }

        if (!hadAuthUserRef.current) {
            hadAuthUserRef.current = true;
            setShowSplash(true);
        }
    }, [authUser, isPosRoute]);

    const authenticatedUser =
        authUser ??
        (authQuery.data?.status === "success" ? authQuery.data.data?.user ?? null : null);

    const displayScaleScope: DisplayScaleScope = isPosRoute ? "pos" : "admin";

    return (
        <DisplayScaleProvider scope={displayScaleScope}>
            <div data-workspace={isPosRoute ? "pos" : "admin"}>
                {!isPosRoute && authQuery.isPending ? (
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
                            <Route path="/pos/login" element={<PosLoginPage />} />
                            <Route path="/pos" element={<PosPage />}>
                                <Route index element={<PosProductsPage />} />
                                <Route path="bills" element={<PosBillsPage />} />
                                <Route path="reports" element={<PosReportsPage />} />
                                <Route path="customers" element={<PosCustomersPage />} />
                                <Route path="purchases" element={<PosPurchasesPage />} />
                                <Route path="whatsapp" element={<PosWhatsAppInboxPage />} />
                            </Route>
                            <Route
                                element={authenticatedUser ? <DashboardLayout /> : <Navigate to="/login" replace />}
                            >
                                <Route path="/dashboard" element={<Navigate to="/organizations" replace />} />
                                <Route path="/organizations" element={<OrganizationsPage />} />
                                <Route path="/organizations/:organizationId" element={<Navigate to="stores" replace />} />
                                <Route path="/organizations/:organizationId/stores" element={<StoresPage />} />
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
                                <Route path="/organizations/:organizationId/stores/:storeId/whatsapp" element={<WhatsAppAccountPage />} />
                                <Route path="/organizations/:organizationId/stores/:storeId/whatsapp/inbox" element={<WhatsAppInboxPage />} />
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
