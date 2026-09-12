import { useState } from "react";
import type { AuthPreviewMode } from "../components/auth/auth-preview-switcher";
import LoginScreen from "./login-screen";
import RegisterPreviewScreen from "./register-preview-screen";

const AuthPreviewScreen = () => {
    const [mode, setMode] = useState<AuthPreviewMode>("login");

    return mode === "login" ? (
        <LoginScreen onSwitchToRegister={() => setMode("register")} />
    ) : (
        <RegisterPreviewScreen onSwitchToLogin={() => setMode("login")} />
    );
};

export default AuthPreviewScreen;
