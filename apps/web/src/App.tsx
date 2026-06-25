import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userAuthenticate } from "@repo/services";

import AppLoader from "@/components/app-loader";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import OrganizationDetailPage from "@/pages/organization-detail-page";
import OrganizationsPage from "@/pages/organizations-page";
import RegisterPage from "@/pages/register-page";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions, useAuthUser } from "@/store/auth.store";

const App = () => {
    const authUser = useAuthUser();
    const { clearUser, setUser } = useAuthActions();

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

    if (authQuery.isPending) {
        return <AppLoader />;
    }

    return (
        <Routes>
            <Route path="/" element={<Navigate to={authUser ? "/dashboard" : "/login"} replace />} />
            <Route path="/login" element={authUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/register" element={authUser ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
            <Route
                element={authUser ? <DashboardLayout /> : <Navigate to="/login" replace />}
            >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/:organizationId" element={<OrganizationDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
