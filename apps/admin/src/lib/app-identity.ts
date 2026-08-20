export const ADMIN_APP_NAME = "Ganatri Admin";
export const POS_APP_NAME = "Ganatri POS";

export const getDocumentTitle = (pathname: string) =>
    pathname.startsWith("/pos") ? POS_APP_NAME : ADMIN_APP_NAME;
