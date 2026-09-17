export type GanatriUtilityIntent =
  | "bill"
  | "due_reminder"
  | "promotion"
  | "text"
  | "reply"
  | "custom_template"
  | "template_management";

export type StoreWhatsAppMode = "disabled" | "ganatri_utility" | "organization_cloud";

export type PlatformAdmissionResult =
  | { admitted: true; sender: "ganatri_utility" | "organization_cloud" }
  | {
      admitted: false;
      reason:
        | "store_disabled"
        | "utility_kind_not_allowed"
        | "custom_message_not_allowed"
        | "template_selection_not_allowed";
      message: string;
    };

export const admitGanatriUtilityIntent = (input: {
  intent: GanatriUtilityIntent;
  customMessage?: string | null;
  templateId?: string | null;
}): PlatformAdmissionResult => {
  if (input.intent !== "bill" && input.intent !== "due_reminder") {
    return {
      admitted: false,
      reason: "utility_kind_not_allowed",
      message: "Ganatri Utility supports bill and due-reminder delivery only",
    };
  }
  if (input.customMessage?.trim()) {
    return {
      admitted: false,
      reason: "custom_message_not_allowed",
      message: "Ganatri Utility messages must use the configured utility template",
    };
  }
  if (input.templateId?.trim()) {
    return {
      admitted: false,
      reason: "template_selection_not_allowed",
      message: "Ganatri Utility messages must use the configured utility template",
    };
  }
  return { admitted: true, sender: "ganatri_utility" };
};

export const admitStoreWhatsAppIntent = (input: {
  mode: StoreWhatsAppMode;
  intent: GanatriUtilityIntent;
  customMessage?: string | null;
  templateId?: string | null;
}): PlatformAdmissionResult => {
  if (input.mode === "disabled") {
    return {
      admitted: false,
      reason: "store_disabled",
      message: "WhatsApp delivery is disabled for this Store",
    };
  }
  if (input.mode === "organization_cloud") {
    return { admitted: true, sender: "organization_cloud" };
  }
  return admitGanatriUtilityIntent(input);
};
