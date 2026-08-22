import type { CloudTemplateParameter } from "./cloud-api/cloud-outbound";
import type { CloudTemplateComponentInput } from "./cloud-api/cloud-template-components";

const templateTokenPattern = /{{\s*([^{}]+?)\s*}}/g;

const templateTokensInOrder = (template: string): string[] =>
  [...template.matchAll(templateTokenPattern)].map(match => match[1]?.trim().toLowerCase() ?? "").filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const componentTextParameters = (
  text: unknown,
  tokenNames: string[],
  values: Record<string, string>,
  cursor: { value: number },
): CloudTemplateParameter[] => {
  if (typeof text !== "string") return [];
  const placeholders = [...text.matchAll(/\{\{\d+\}\}/g)];
  return placeholders.map(() => {
    const token = tokenNames[cursor.value++];
    const value = token ? values[token] : undefined;
    if (!value?.trim()) throw new Error("Cloud bill template variables do not match the local template");
    return { type: "text", text: value };
  });
};

export const buildInvoiceCloudComponents = (
  definitions: unknown[],
  localTemplateBody: string,
  values: Record<string, string>,
  documentLink: string,
): CloudTemplateComponentInput[] => {
  const tokenNames = templateTokensInOrder(localTemplateBody);
  const cursor = { value: 0 };
  const inputs: CloudTemplateComponentInput[] = [];
  let hasDocumentHeader = false;

  for (const definition of definitions) {
    if (!isRecord(definition)) continue;
    const type = typeof definition.type === "string" ? definition.type.toLowerCase() : "";
    const format = typeof definition.format === "string" ? definition.format.toLowerCase() : "";
    if (type === "header" && format === "document") {
      hasDocumentHeader = true;
      inputs.push({ type: "header", parameters: [{ type: "document", document: { link: documentLink } }] });
      continue;
    }
    if (type === "header" && (format === "image" || format === "video")) {
      throw new Error("Cloud bill template must use a document header");
    }
    if (type === "header" || type === "body") {
      const parameters = componentTextParameters(definition.text, tokenNames, values, cursor);
      if (parameters.length > 0) inputs.push({ type, parameters });
      continue;
    }
    if (type === "buttons" || type === "button") {
      const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
      buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const parameters = componentTextParameters(button.url, tokenNames, values, cursor);
        if (parameters.length > 0) inputs.push({ type: "button", subType: "url", index: String(index), parameters });
      });
    }
  }
  if (!hasDocumentHeader) throw new Error("Cloud bill template must include a document header");
  if (cursor.value !== tokenNames.length) throw new Error("Cloud bill template variables do not match the local template");
  return inputs;
};
