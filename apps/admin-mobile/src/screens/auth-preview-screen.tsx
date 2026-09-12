import { useState } from "react";
import LoginScreen from "./login-screen";
import RegistrationScreen from "./registration-screen";

type AuthPreviewMode = "login" | "register";

const AuthPreviewScreen = () => {
    const [mode, setMode] = useState<AuthPreviewMode>("login");

    return mode === "login" ? (
        <LoginScreen onSwitchToRegister={() => setMode("register")} />
    ) : (
        <RegistrationScreen onSwitchToLogin={() => setMode("login")} />
    );
};

export default AuthPreviewScreen;
