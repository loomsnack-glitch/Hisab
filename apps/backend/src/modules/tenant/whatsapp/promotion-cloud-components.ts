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
  const seen = new Set<string>();
  return [...text.matchAll(/\{\{(\d+)\}\}/g)].flatMap(match => {
    const placeholder = match[1]!;
    if (seen.has(placeholder)) return [];
    seen.add(placeholder);
    const token = mapping[`${componentKey}:${match[1]}`];
    const value = token ? values[token] : undefined;
    if (!value?.trim()) throw new Error("Cloud promotion template variables do not match the local template");
    return [{ type: "text", text: value }];
  });
};

export const buildPromotionCloudComponents = (
  definitions: unknown[],
  localTemplateBody: string,
  values: Record<string, string>,
  imageLink: string | null,
  variableMapping: CloudTemplateVariableMapping,
): CloudTemplateComponentInput[] => {
  const mapping = validateCloudTemplateVariableMapping(variableMapping, localTemplateBody, definitions);
  const inputs: CloudTemplateComponentInput[] = [];
  let hasImageHeader = false;

  for (const definition of definitions) {
    if (!isRecord(definition)) continue;
    const type = typeof definition.type === "string" ? definition.type.toLowerCase() : "";
    const format = typeof definition.format === "string" ? definition.format.toLowerCase() : "";
    if (type === "header") {
      if (["video", "document"].includes(format)) throw new Error("Cloud promotion templates cannot use video or document headers");
      if (format === "image") {
        if (!imageLink) throw new Error("This Cloud promotion template requires an image");
        hasImageHeader = true;
        inputs.push({ type: "header", parameters: [{ type: "image", image: { link: imageLink } }] });
        continue;
      }
      const parameters = textParameters(definition.text, type, mapping, values);
      if (parameters.length > 0) inputs.push({ type: "header", parameters });
      continue;
    }
    if (type === "body") {
      const parameters = textParameters(definition.text, type, mapping, values);
      if (parameters.length > 0) inputs.push({ type: "body", parameters });
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
  if (imageLink && !hasImageHeader) throw new Error("An image can only be sent with an approved image-header template");
  return inputs;
};
