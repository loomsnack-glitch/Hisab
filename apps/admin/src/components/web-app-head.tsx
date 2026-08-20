import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { getWebAppIdentity, getWebAppWorkspace } from "@/lib/web-app-manifest";

const setMetaContent = (name: string, content: string) => {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
    }
    meta.content = content;
};

const WebAppHead = () => {
    const { pathname } = useLocation();
    const identity = getWebAppIdentity(getWebAppWorkspace(pathname));

    useEffect(() => {
        let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        if (!manifest) {
            manifest = document.createElement("link");
            manifest.rel = "manifest";
            document.head.appendChild(manifest);
        }
        manifest.href = identity.manifestHref;

        setMetaContent("apple-mobile-web-app-title", identity.name);
        setMetaContent("theme-color", identity.themeColor);
    }, [identity.manifestHref, identity.name, identity.themeColor]);

    return null;
};

export default WebAppHead;
