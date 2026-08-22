const tokenPattern = /{{\s*([^{}]+?)\s*}}/g;
const providerPlaceholderPattern = /\{\{(\d+)\}\}/g;

export type CloudTemplateVariableMapping = Record<string, string>;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizedType = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const localTokenNames = (body: string): string[] =>
  [...body.matchAll(tokenPattern)]
    .map(match => match[1]?.trim().toLowerCase() ?? "")
    .filter(Boolean);

const placeholderIndexes = (value: unknown): string[] =>
  typeof value === "string"
    ? [...value.matchAll(providerPlaceholderPattern)].map(match => match[1] ?? "")
    : [];

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
  const names = localTokenNames(localBody);
  const keys = cloudTemplateVariableKeys(definitions);
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
  const localTokens = localTokenNames(localBody);
  const localCounts = new Map<string, number>();
  localTokens.forEach(token => localCounts.set(token, (localCounts.get(token) ?? 0) + 1));
  const expectedKeys = cloudTemplateVariableKeys(definitions);
  const result: CloudTemplateVariableMapping = {};
  for (const key of expectedKeys) {
    const value = mapping[key];
    if (typeof value !== "string" || !localCounts.has(value.trim().toLowerCase())) {
      throw new Error(`Cloud template variable mapping is missing ${key}`);
    }
    result[key] = value.trim().toLowerCase();
  }
  if (Object.keys(mapping).some(key => !expectedKeys.includes(key))) {
    throw new Error("Cloud template variable mapping contains an unknown placeholder");
  }
  const mappedCounts = new Map<string, number>();
  Object.values(result).forEach(value => mappedCounts.set(value, (mappedCounts.get(value) ?? 0) + 1));
  for (const [name, count] of localCounts) {
    if (mappedCounts.get(name) !== count) {
      throw new Error("Cloud template variable mapping does not cover the local template");
    }
  }
  if (Object.keys(result).length !== localTokens.length) {
    throw new Error("Cloud template variable mapping does not cover the local template");
  }
  return result;
};
