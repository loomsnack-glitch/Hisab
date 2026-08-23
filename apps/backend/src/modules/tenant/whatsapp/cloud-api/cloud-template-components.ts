import type {
  CloudTemplateComponent,
  CloudTemplateParameter,
} from "./cloud-outbound";

export type CloudTemplateComponentInput = {
  type: CloudTemplateComponent["type"];
  subType?: CloudTemplateComponent["sub_type"];
  index?: string;
  parameters: CloudTemplateParameter[];
};

export class CloudTemplateComponentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudTemplateComponentError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizedType = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const parameterCount = (value: unknown): number =>
  typeof value === "string"
    ? new Set(value.match(/\{\{\d+\}\}/g) ?? []).size
    : 0;

const safeText = (value: unknown, label: string, maxLength: number): string => {
  if (typeof value !== "string") {
    throw new CloudTemplateComponentError(`${label} must be text`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new CloudTemplateComponentError(`${label} is invalid`);
  }
  return value;
};

const safeIdentifier = (value: unknown, label: string): string => {
  const normalized = safeText(value, label, 255).trim();
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) {
    throw new CloudTemplateComponentError(`${label} is invalid`);
  }
  return normalized;
};

const safeCurrencyCode = (value: unknown): string => {
  const normalized = safeIdentifier(value, "Currency code").toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new CloudTemplateComponentError("Currency code is invalid");
  }
  return normalized;
};

const safeHttpsLink = (value: unknown, label: string): string => {
  const normalized = safeText(value, label, 2_048).trim();
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new CloudTemplateComponentError(`${label} is invalid`);
  }
  if (url.protocol !== "https:") {
    throw new CloudTemplateComponentError(`${label} must use HTTPS`);
  }
  return normalized;
};

const validateParameter = (parameter: CloudTemplateParameter): CloudTemplateParameter => {
  if (!isRecord(parameter) || typeof parameter.type !== "string") {
    throw new CloudTemplateComponentError("Template parameter is invalid");
  }
  switch (parameter.type) {
    case "text":
      return {
        type: "text",
        text: safeText(parameter.text, "Template text parameter", 4_096),
      };
    case "currency": {
      const value = parameter.currency;
      if (!isRecord(value) || typeof value.amount_1000 !== "number" || !Number.isInteger(value.amount_1000) || value.amount_1000 < 0) {
        throw new CloudTemplateComponentError("Currency template parameter is invalid");
      }
      return {
        type: "currency",
        currency: {
          fallback_value: safeText(value.fallback_value, "Currency fallback value", 255),
          code: safeCurrencyCode(value.code),
          amount_1000: value.amount_1000,
        },
      };
    }
    case "date_time": {
      const value = parameter.date_time;
      if (!isRecord(value)) {
        throw new CloudTemplateComponentError("Date-time template parameter is invalid");
      }
      const { fallback_value, ...extra } = value;
      return {
        type: "date_time",
        date_time: {
          ...extra,
          fallback_value: safeText(fallback_value, "Date-time fallback value", 255),
        } as { fallback_value: string; [key: string]: string | number },
      };
    }
    case "image":
    case "document": {
      const value = parameter.type === "image" ? parameter.image : parameter.document;
      if (!isRecord(value)) {
        throw new CloudTemplateComponentError(`${parameter.type} template parameter is invalid`);
      }
      const source = value as { id?: unknown; link?: unknown };
      const hasId = source.id !== undefined;
      const hasLink = source.link !== undefined;
      if (hasId === hasLink) {
        throw new CloudTemplateComponentError(`${parameter.type} template parameter needs exactly one source`);
      }
      return parameter.type === "image"
        ? { type: "image", image: hasId ? { id: safeIdentifier(source.id, "Image media id") } : { link: safeHttpsLink(source.link, "Image media link") } }
        : { type: "document", document: hasId ? { id: safeIdentifier(source.id, "Document media id") } : { link: safeHttpsLink(source.link, "Document media link") } };
    }
    default:
      throw new CloudTemplateComponentError("Unsupported template parameter type");
  }
};

const definitionParameterCount = (
  definition: Record<string, unknown>,
  component?: CloudTemplateComponentInput,
): number => {
  if (normalizedType(definition.type) === "header") {
    const format = definitionFormat(definition);
    if (format === "image" || format === "document" || format === "video") return 1;
  }
  const direct = parameterCount(definition.text);
  if (direct > 0) return direct;
  const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
  if (component?.type === "button") {
    const button = buttons[Number(component.index ?? "-1")];
    return isRecord(button) ? parameterCount(button.url) : 0;
  }
  return buttons.reduce((count, button) => {
    if (!isRecord(button)) return count;
    return count + parameterCount(button.url);
  }, 0);
};

const definitionFormat = (definition: Record<string, unknown>): string =>
  normalizedType(definition.format);

const matchingDefinition = (
  definitions: unknown[],
  component: CloudTemplateComponentInput,
): Record<string, unknown> | null => {
  const type = component.type.toLowerCase();
  const index = component.index ?? "";
  if (type !== "button" && index !== "") {
    throw new CloudTemplateComponentError("Only button components may have an index");
  }
  if (type === "button" && (!/^\d+$/.test(index) || !component.subType)) {
    throw new CloudTemplateComponentError("Button component index and subtype are required");
  }
  for (const value of definitions) {
    if (!isRecord(value)) continue;
    const definitionType = normalizedType(value.type);
    const matchesButton = type === "button" && (definitionType === "button" || definitionType === "buttons");
    if (definitionType !== type && !matchesButton) continue;
    if (type !== "button" || definitionType === "buttons" || String(value.index ?? "") === index) return value;
  }
  return null;
};

const validateParameterFormat = (
  definition: Record<string, unknown>,
  component: CloudTemplateComponentInput,
): void => {
  const format = definitionFormat(definition);
  if (component.type !== "header" || !format) return;
  if (format === "image" && component.parameters.some(parameter => parameter.type !== "image")) {
    throw new CloudTemplateComponentError("Image header requires an image parameter");
  }
  if (format === "document" && component.parameters.some(parameter => parameter.type !== "document")) {
    throw new CloudTemplateComponentError("Document header requires a document parameter");
  }
  if (format === "video") {
    throw new CloudTemplateComponentError("Video template headers are not supported");
  }
};

/**
 * Build the small provider component payload from an approved template's
 * immutable component definition. Required placeholders and media formats are
 * checked here so feature callers cannot enqueue a malformed Cloud payload.
 */
export const buildCloudTemplateComponents = (
  definitions: unknown[],
  inputs: CloudTemplateComponentInput[] = [],
): CloudTemplateComponent[] => {
  if (!Array.isArray(definitions)) {
    throw new CloudTemplateComponentError("Cloud template definitions are invalid");
  }
  const seen = new Set<string>();
  const output = inputs.map(input => {
    const definition = matchingDefinition(definitions, input);
    if (!definition) throw new CloudTemplateComponentError("Template component does not exist");
    const key = `${input.type}:${input.index ?? ""}`;
    if (seen.has(key)) throw new CloudTemplateComponentError("Template component is duplicated");
    seen.add(key);
    if (!Array.isArray(input.parameters) || input.parameters.length === 0) {
      throw new CloudTemplateComponentError("Template component parameters are required");
    }
    const parameters = input.parameters.map(validateParameter);
    const expected = definitionParameterCount(definition, input);
    if (expected !== parameters.length) {
      throw new CloudTemplateComponentError("Template component parameter count is invalid");
    }
    validateParameterFormat(definition, input);
    return {
      type: input.type,
      ...(input.subType ? { sub_type: input.subType } : {}),
      ...(input.index !== undefined ? { index: input.index } : {}),
      parameters,
    };
  });

  for (const value of definitions) {
    if (!isRecord(value) || definitionParameterCount(value) === 0) continue;
    const type = normalizedType(value.type);
    if (type === "button" || type === "buttons") {
      const buttons = Array.isArray(value.buttons) ? value.buttons : [];
      buttons.forEach((button, index) => {
        if (!isRecord(button) || parameterCount(button.url) === 0) return;
        if (!seen.has(`button:${index}`)) throw new CloudTemplateComponentError("Required button parameters are missing");
      });
      continue;
    }
    if (!seen.has(`${type}:`)) throw new CloudTemplateComponentError("Required template parameters are missing");
  }
  return output;
};
