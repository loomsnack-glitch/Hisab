import type { CloudTemplateParameter } from "./cloud-api/cloud-outbound";
import type { CloudTemplateComponentInput } from "./cloud-api/cloud-template-components";
import { validateCloudTemplateVariableMapping, type CloudTemplateVariableMapping } from "./cloud-api/cloud-template-variable-mapping";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textParameters = (
  text: unknown,
  componentKey: string,
  mapping: CloudTemplateVariableMapping,
  values: Record<string, string>,
): CloudTemplateParameter[] => {
  if (typeof text !== "string") return [];
  return [...text.matchAll(/\{\{(\d+)\}\}/g)].map(match => {
    const token = mapping[`${componentKey}:${match[1]}`];
    const value = token ? values[token] : undefined;
    if (!value?.trim()) throw new Error("Cloud due-reminder template variables do not match the local template");
    return { type: "text", text: value };
  });
};

export const buildDueReminderCloudComponents = (
  definitions: unknown[],
  localTemplateBody: string,
  values: Record<string, string>,
  variableMapping: CloudTemplateVariableMapping,
  documentLink: string | null = null,
): CloudTemplateComponentInput[] => {
  const mapping = validateCloudTemplateVariableMapping(variableMapping, localTemplateBody, definitions);
  const inputs: CloudTemplateComponentInput[] = [];
  let hasDocumentHeader = false;

  for (const definition of definitions) {
    if (!isRecord(definition)) continue;
    const type = typeof definition.type === "string" ? definition.type.toLowerCase() : "";
    const format = typeof definition.format === "string" ? definition.format.toLowerCase() : "";
    if (type === "header" && format === "document") {
      if (!documentLink) throw new Error("Cloud due-reminder template requires a PDF invoice");
      hasDocumentHeader = true;
      inputs.push({ type: "header", parameters: [{ type: "document", document: { link: documentLink } }] });
      continue;
    }
    if (type === "header" && ["image", "video"].includes(format)) {
      throw new Error("Cloud due-reminder templates only support document headers");
    }
    if (type === "header" || type === "body") {
      const parameters = textParameters(definition.text, type, mapping, values);
      if (parameters.length > 0) inputs.push({ type, parameters });
      continue;
    }
    if (type === "buttons" || type === "button") {
      const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
      buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const parameters = textParameters(button.url, `button:${index}`, mapping, values);
        if (parameters.length > 0) inputs.push({ type: "button", subType: "url", index: String(index), parameters });
      });
    }
  }
  if (documentLink && !hasDocumentHeader) throw new Error("A PDF can only be sent with an approved document-header template");
  return inputs;
};
