import type { WhatsAppTemplatePreviewDTO } from "@repo/types";
import type { CloudTemplateComponent } from "./cloud-outbound";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const componentType = (value: unknown): string =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const outboundFor = (
  components: unknown[],
  type: CloudTemplateComponent["type"],
  index?: number,
): unknown => components.find((component) =>
  isRecord(component)
  && component.type === type
  && (index === undefined || component.index === String(index)),
);

const parameterValue = (parameter: unknown): string | null => {
  if (!isRecord(parameter) || typeof parameter.type !== "string") return null;
  if (parameter.type === "text") return typeof parameter.text === "string" ? parameter.text : null;
  if (parameter.type === "currency" && isRecord(parameter.currency)) {
    return typeof parameter.currency.fallback_value === "string" ? parameter.currency.fallback_value : null;
  }
  if (parameter.type === "date_time" && isRecord(parameter.date_time)) {
    return typeof parameter.date_time.fallback_value === "string" ? parameter.date_time.fallback_value : null;
  }
  return null;
};

const parametersFor = (
  component: unknown,
): unknown[] => isRecord(component) && Array.isArray(component.parameters) ? component.parameters : [];

const replaceVariables = (text: string, parameters: unknown[]): string =>
  text.replace(/\{\{(\d+)\}\}/g, (placeholder, rawIndex) =>
    parameterValue(parameters[Number(rawIndex) - 1]) ?? placeholder,
  );

const safeHttpsUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const mediaUrl = (parameter: unknown): string | null => {
  if (!isRecord(parameter) || (parameter.type !== "image" && parameter.type !== "document")) return null;
  const media = parameter[parameter.type];
  return isRecord(media) ? safeHttpsUrl(media.link) : null;
};

const definitionText = (component: RecordValue): string | null =>
  typeof component.text === "string" ? component.text : null;

export const buildCloudTemplatePreview = (
  definition: unknown[] | null | undefined,
  outboundComponents: unknown[],
): WhatsAppTemplatePreviewDTO | null => {
  if (!Array.isArray(definition) || definition.length === 0) return null;

  const headerDefinition = definition.find((component) =>
    isRecord(component) && componentType(component.type) === "HEADER",
  );
  const bodyDefinition = definition.find((component) =>
    isRecord(component) && componentType(component.type) === "BODY",
  );
  const footerDefinition = definition.find((component) =>
    isRecord(component) && componentType(component.type) === "FOOTER",
  );
  const buttonsDefinition = definition.find((component) =>
    isRecord(component) && componentType(component.type) === "BUTTONS",
  );

  const header = isRecord(headerDefinition)
    ? (() => {
      const outboundHeader = outboundFor(outboundComponents, "header");
      const format = componentType(headerDefinition.format);
      if (format === "IMAGE") {
        return { type: "image" as const, url: mediaUrl(parametersFor(outboundHeader)[0]), label: "Image header" };
      }
      if (format === "DOCUMENT") {
        return { type: "document" as const, url: mediaUrl(parametersFor(outboundHeader)[0]), label: "Document header" };
      }
      const text = definitionText(headerDefinition);
      return text === null ? null : { type: "text" as const, text: replaceVariables(text, parametersFor(outboundHeader)) };
    })()
    : null;

  const body = isRecord(bodyDefinition)
    ? definitionText(bodyDefinition)
    : null;
  if (body === null) return null;

  const buttons = isRecord(buttonsDefinition) && Array.isArray(buttonsDefinition.buttons)
    ? buttonsDefinition.buttons.flatMap((value, index) => {
      if (!isRecord(value) || typeof value.text !== "string") return [];
      const outboundButton = outboundFor(outboundComponents, "button", index);
      const parameters = parametersFor(outboundButton);
      const type = componentType(value.type) === "URL"
        ? "url" as const
        : componentType(value.type) === "QUICK_REPLY"
          ? "quick_reply" as const
          : "other" as const;
      const staticUrl = typeof value.url === "string" ? value.url : null;
      const resolvedUrl = type === "url" && staticUrl
        ? safeHttpsUrl(replaceVariables(staticUrl, parameters))
        : null;
      return [{
        type,
        text: replaceVariables(value.text, parameters),
        url: resolvedUrl,
      }];
    })
    : [];

  return {
    header,
    body: replaceVariables(body, parametersFor(outboundFor(outboundComponents, "body"))),
    footer: isRecord(footerDefinition) && definitionText(footerDefinition)
      ? replaceVariables(definitionText(footerDefinition)!, parametersFor(outboundFor(outboundComponents, "footer")))
      : null,
    buttons,
  };
};
