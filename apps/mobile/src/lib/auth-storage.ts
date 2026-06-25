import * as SecureStore from "expo-secure-store";
import { configureAuthTokenStorage } from "@repo/services";

const AUTH_TOKEN_KEY = "ganatri_auth_token";

configureAuthTokenStorage({
    getItem: () => SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    setItem: (token) => SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
    removeItem: () => SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
});
