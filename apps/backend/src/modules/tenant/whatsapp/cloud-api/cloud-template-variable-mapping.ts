const tokenPattern = /{{\s*([^{}]+?)\s*}}/g;
const providerPlaceholderPattern = /\{\{(\d+)\}\}/g;

export type CloudTemplateVariableMapping = Record<string, string>;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizedType = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const uniqueStrings = (values: string[]): string[] => [...new Set(values)];

const localTokenNames = (body: string): string[] =>
  uniqueStrings(
    [...body.matchAll(tokenPattern)]
      .map(match => match[1]?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  );

const requiredLocalTokenNames = (body: string, keys: string[]): string[] => {
  const names = localTokenNames(body);
  const hasDynamicButton = keys.some(key => key.startsWith("button:"));
  return hasDynamicButton ? names : names.filter(name => name !== "invoice_url");
};

const placeholderIndexes = (value: unknown): string[] =>
  typeof value === "string"
    ? uniqueStrings([...value.matchAll(providerPlaceholderPattern)].map(match => match[1] ?? ""))
    : [];

export const uniqueProviderPlaceholderIndexes = (text: unknown): string[] =>
  placeholderIndexes(text).sort((left, right) => Number(left) - Number(right));

const variableKeysForDefinition = (definition: RecordValue): string[] => {
  const type = normalizedType(definition.type);
  if (type === "header" || type === "body") {
    return placeholderIndexes(definition.text).map(index => `${type}:${index}`);
  }
  if (type !== "button" && type !== "buttons") return [];
  const buttons = Array.isArray(definition.buttons) ? definition.buttons : [];
  return buttons.flatMap((button, buttonIndex) =>
    isRecord(button)
      ? placeholderIndexes(button.url).map(index => `button:${buttonIndex}:${index}`)
      : [],
  );
};

export const cloudTemplateVariableKeys = (definitions: unknown[]): string[] =>
  definitions.flatMap(definition => isRecord(definition) ? variableKeysForDefinition(definition) : []);

export const buildDefaultCloudTemplateVariableMapping = (
  localBody: string,
  definitions: unknown[],
): CloudTemplateVariableMapping => {
  const keys = cloudTemplateVariableKeys(definitions);
  const names = requiredLocalTokenNames(localBody, keys);
  if (names.length !== keys.length) {
    throw new Error("Local and Cloud template variable counts do not match");
  }
  return Object.fromEntries(keys.map((key, index) => [key, names[index]!])) as CloudTemplateVariableMapping;
};

export const validateCloudTemplateVariableMapping = (
  mapping: unknown,
  localBody: string,
  definitions: unknown[],
): CloudTemplateVariableMapping => {
  if (!isRecord(mapping)) throw new Error("Cloud template variable mapping is invalid");
  const expectedKeys = cloudTemplateVariableKeys(definitions);
  const localTokens = requiredLocalTokenNames(localBody, expectedKeys);
  const result: CloudTemplateVariableMapping = {};
  for (const key of expectedKeys) {
    const value = mapping[key];
    if (typeof value !== "string" || !localTokens.includes(value.trim().toLowerCase())) {
      throw new Error(`Cloud template variable mapping is missing ${key}`);
    }
    result[key] = value.trim().toLowerCase();
  }
  if (Object.keys(mapping).some(key => !expectedKeys.includes(key))) {
    throw new Error("Cloud template variable mapping contains an unknown placeholder");
  }
  const mappedTokens = uniqueStrings(Object.values(result));
  if (mappedTokens.length !== localTokens.length || localTokens.some(token => !mappedTokens.includes(token))) {
    throw new Error("Cloud template variable mapping does not cover the local template");
  }
  if (Object.keys(result).length !== localTokens.length) {
    throw new Error("Cloud template variable mapping does not cover the local template");
  }
  return result;
};
