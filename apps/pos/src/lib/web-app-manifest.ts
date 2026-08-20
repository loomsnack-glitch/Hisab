export type WebAppWorkspace = "pos";

export const WEB_APP_SCOPE = "/";

type WebAppIdentity = {
    name: string;
    shortName: string;
    startUrl: string;
    id: string;
    manifestHref: string;
    themeColor: string;
};

const posIdentity: WebAppIdentity = {
    name: "Ganatri POS",
    shortName: "Ganatri POS",
    startUrl: "/",
    id: "/",
    manifestHref: "/pos.webmanifest",
    themeColor: "#2563eb",
};

export const getWebAppIdentity = () => posIdentity;

export const buildWebAppManifest = () => {
    const identity = getWebAppIdentity();

    return {
        name: identity.name,
        short_name: identity.shortName,
        start_url: identity.startUrl,
        scope: WEB_APP_SCOPE,
        display: "standalone",
        id: identity.id,
        background_color: "#ffffff",
        theme_color: identity.themeColor,
        icons: [
            {
                src: "/apple-touch-icon.png",
                sizes: "1080x1080",
                type: "image/png",
                purpose: "any",
            },
        ],
    };
};
