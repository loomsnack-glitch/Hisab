import { useState } from "react";
import type { AuthPreviewMode } from "../components/auth/auth-preview-switcher";
import LoginPreviewScreen from "./login-preview-screen";
import RegisterPreviewScreen from "./register-preview-screen";

const AuthPreviewScreen = () => {
    const [mode, setMode] = useState<AuthPreviewMode>("login");

    return mode === "login" ? (
        <LoginPreviewScreen onSwitchToRegister={() => setMode("register")} />
    ) : (
        <RegisterPreviewScreen onSwitchToLogin={() => setMode("login")} />
    );
};

export default AuthPreviewScreen;
