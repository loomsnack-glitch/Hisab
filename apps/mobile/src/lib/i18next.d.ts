import "i18next";
import type { appResources } from "./localization-boundary";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "common";
        resources: (typeof appResources)["en"];
    }
}
