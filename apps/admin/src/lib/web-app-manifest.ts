export const WEB_APP_SCOPE = "/";

type WebAppIdentity = {
    name: string;
    shortName: string;
    startUrl: string;
    id: string;
    manifestHref: string;
    themeColor: string;
};

const adminIdentity: WebAppIdentity = {
    name: "Ganatri Admin",
    shortName: "Ganatri Admin",
    startUrl: "/organizations",
    id: "/",
    manifestHref: "/admin.webmanifest",
    themeColor: "#2563eb",
};

export const getWebAppIdentity = () => adminIdentity;

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

/** iOS home-screen web clips without a manifest keep only URLs under the added page. */
export const isWithinStartUrlPrefix = (startUrl: string, nextPath: string) => {
    if (nextPath === startUrl) {
        return true;
    }

    const prefix = startUrl.endsWith("/") ? startUrl : `${startUrl}/`;
    return nextPath.startsWith(prefix);
};

export const isPathInWebAppScope = (pathname: string, scope = WEB_APP_SCOPE) => {
    if (scope === "/") {
        return pathname.startsWith("/");
    }

    return pathname === scope || pathname.startsWith(scope.endsWith("/") ? scope : `${scope}/`);
};
