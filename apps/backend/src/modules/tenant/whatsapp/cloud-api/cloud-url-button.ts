const dynamicUrlPattern = /^(.*)\{\{\d+\}\}(.*)$/;

export const getCloudUrlButtonParameter = (
  templateUrl: unknown,
  value: string,
): string => {
  const template = typeof templateUrl === "string" ? templateUrl.trim() : "";
  const normalizedValue = value.trim();
  const match = dynamicUrlPattern.exec(template);
  if (!match) return value;

  const prefix = match[1] ?? "";
  const suffix = match[2] ?? "";
  if (normalizedValue.startsWith(prefix) && normalizedValue.endsWith(suffix)) {
    const end = suffix
      ? normalizedValue.length - suffix.length
      : normalizedValue.length;
    const parameter = normalizedValue.slice(prefix.length, end);
    if (parameter) return parameter;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    throw new Error(
      "Cloud URL button value does not match the approved template URL",
    );
  }
  return value;
};
