import type { CloudTemplateParameter } from "./cloud-api/cloud-outbound";
import type { CloudTemplateComponentInput } from "./cloud-api/cloud-template-components";

const tokenPattern = /{{\s*([^{}]+?)\s*}}/g;

const tokensInOrder = (template: string): string[] =>
  [...template.matchAll(tokenPattern)]
    .map(match => match[1]?.trim().toLowerCase() ?? "")
    .filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textParameters = (
  text: unknown,
  tokens: string[],
  values: Record<string, string>,
  cursor: { value: number },
): CloudTemplateParameter[] => {
  if (typeof text !== "string") return [];
  return [...text.matchAll(/\{\{\d+\}\}/g)].map(() => {
    const token = tokens[cursor.value++];
    const value = token ? values[token] : undefined;
    if (!value?.trim()) throw new Error("Cloud promotion template variables do not match the local template");
    return { type: "text", text: value };
  });
};

export const buildPromotionCloudComponents = (
  definitions: unknown[],
  localTemplateBody: string,
  values: Record<string, string>,
  imageLink: string | null,
): CloudTemplateComponentInput[] => {
  const tokens = tokensInOrder(localTemplateBody);
  const cursor = { value: 0 };
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
      const parameters = textParameters(definition.text, tokens, values, cursor);
      if (parameters.length > 0) inputs.push({ type: "header", parameters });
      continue;
    }
    if (type === "body") {
      const parameters = textParameters(definition.text, tokens, values, cursor);
      if (parameters.length > 0) inputs.push({ type: "body", parameters });
      continue;
    }
    if (type === "buttons" || type === "button") {
      const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
      buttons.forEach((button, index) => {
        if (!isRecord(button)) return;
        const parameters = textParameters(button.url, tokens, values, cursor);
        if (parameters.length > 0) inputs.push({ type: "button", subType: "url", index: String(index), parameters });
      });
    }
  }
  if (imageLink && !hasImageHeader) throw new Error("An image can only be sent with an approved image-header template");
  if (cursor.value !== tokens.length) throw new Error("Cloud promotion template variables do not match the local template");
  return inputs;
};
