export const googleContactDisplayName = (input: {
  customerName: string;
  prefix?: string | null;
  postfix?: string | null;
}): string => {
  const name = input.customerName.trim();
  const prefix = input.prefix?.trim() ?? "";
  const postfix = input.postfix?.trim() ?? "";
  return [prefix, name, postfix].filter((part) => part.length > 0).join(" ");
};
