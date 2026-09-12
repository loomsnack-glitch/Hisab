import { useState } from "react";
import type { AuthPreviewMode } from "../components/auth/auth-preview-switcher";
import LoginScreen from "./login-screen";
import RegistrationScreen from "./registration-screen";

const AuthPreviewScreen = () => {
    const [mode, setMode] = useState<AuthPreviewMode>("login");

    return mode === "login" ? (
        <LoginScreen onSwitchToRegister={() => setMode("register")} />
    ) : (
        <RegistrationScreen onSwitchToLogin={() => setMode("login")} />
    );
};

export default AuthPreviewScreen;
