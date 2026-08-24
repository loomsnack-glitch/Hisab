import type { CloudTemplateParameter } from "./cloud-api/cloud-outbound";
import type { CloudTemplateComponentInput } from "./cloud-api/cloud-template-components";
import { uniqueProviderPlaceholderIndexes, validateCloudTemplateVariableMapping, type CloudTemplateVariableMapping } from "./cloud-api/cloud-template-variable-mapping";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const cloudInvoiceTemplateHasDocumentHeader = (definitions: unknown[]): boolean =>
  definitions.some(definition => {
    if (!isRecord(definition)) return false;
    return String(definition.type ?? "").toLowerCase() === "header" &&
      String(definition.format ?? "").toLowerCase() === "document";
  });

const componentTextParameters = (
  text: unknown,
  componentKey: string,
  mapping: CloudTemplateVariableMapping,
  values: Record<string, string>,
): CloudTemplateParameter[] =>
  uniqueProviderPlaceholderIndexes(text).map(providerIndex => {
    const token = mapping[`${componentKey}:${providerIndex}`];
    const value = token ? values[token] : undefined;
    if (!value?.trim()) throw new Error("Cloud bill template variables do not match the local template");
    return { type: "text", text: value };
  });

export const buildInvoiceCloudComponents = (
  definitions: unknown[],
  localTemplateBody: string,
  values: Record<string, string>,
  documentLink: string | null,
  variableMapping: CloudTemplateVariableMapping,
): CloudTemplateComponentInput[] => {
  const mapping = validateCloudTemplateVariableMapping(variableMapping, localTemplateBody, definitions);
  const inputs: CloudTemplateComponentInput[] = [];
  const hasDocumentHeader = cloudInvoiceTemplateHasDocumentHeader(definitions);

  for (const definition of definitions) {
    if (!isRecord(definition)) continue;
    const type = typeof definition.type === "string" ? definition.type.toLowerCase() : "";
    const format = typeof definition.format === "string" ? definition.format.toLowerCase() : "";
    if (type === "header" && format === "document") {
      if (!documentLink) throw new Error("Cloud bill document-header templates require an invoice PDF");
      inputs.push({ type: "header", parameters: [{ type: "document", document: { link: documentLink } }] });
      continue;
    }
    if (type === "header" && (format === "image" || format === "video")) {
      throw new Error("Cloud bill template must use a document header");
    }
    if (type === "header" || type === "body") {
      const parameters = componentTextParameters(definition.text, type, mapping, values);
      if (parameters.length > 0) inputs.push({ type, parameters });
      continue;
    }
    if (type === "buttons" || type === "button") {
      const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
      buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const parameters = componentTextParameters(button.url, `button:${index}`, mapping, values);
        if (parameters.length > 0) inputs.push({ type: "button", subType: "url", index: String(index), parameters });
      });
    }
  }
  if (documentLink && !hasDocumentHeader) {
    throw new Error("An invoice PDF can only be sent with a document-header template");
  }
  return inputs;
};
