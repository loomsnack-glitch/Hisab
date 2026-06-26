import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userAuthenticate } from "@repo/services";
import SplashLoader from "@repo/ui/components/loaders/splash-loader";

import DashboardLayout from "@/components/dashboard/dashboard-layout";
import BillingPage from "@/pages/billing-page";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import OrganizationDetailPage from "@/pages/organization-detail-page";
import OrganizationsPage from "@/pages/organizations-page";
import RegisterPage from "@/pages/register-page";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";

const SPLASH_DURATION_MS = 2200;

const App = () => {
    const authUser = useAuthUser();
    const { clearUser, setUser } = useAuthActions();
    const [showSplash, setShowSplash] = useState(false);
    const hadAuthUserRef = useRef(false);

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

    if (authQuery.isPending) {
        return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading" />;
    }

    return (
        <>
            <Routes>
                <Route path="/" element={<Navigate to={authenticatedUser ? "/dashboard" : "/login"} replace />} />
                <Route path="/login" element={authenticatedUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
                <Route
                    path="/register"
                    element={authenticatedUser ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
                />
                <Route
                    element={authenticatedUser ? <DashboardLayout /> : <Navigate to="/login" replace />}
                >
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/organizations" element={<OrganizationsPage />} />
                    <Route path="/organizations/:organizationId" element={<OrganizationDetailPage />} />
                    <Route path="/organizations/:organizationId/billing" element={<BillingPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {showSplash && authUser ? (
                <SplashLoader durationMs={SPLASH_DURATION_MS} onComplete={() => setShowSplash(false)} />
            ) : null}
        </>
    );
};

export default App;
