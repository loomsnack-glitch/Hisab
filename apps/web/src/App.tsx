import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userAuthenticate } from "@repo/services";

import AppLoader from "@/components/app-loader";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import { useAuthActions, useAuthUser } from "@/store/auth.store";

const AUTH_QUERY_KEY = ["auth", "me"] as const;

const App = () => {
    const authUser = useAuthUser();
    const { clearUser, setUser } = useAuthActions();

    const authQuery = useQuery({
        queryKey: AUTH_QUERY_KEY,
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
            <Route path="/dashboard" element={authUser ? <DashboardPage /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
