export function joinAriaIds(...values: Array<string | undefined>): string | undefined {
  const ids = values.filter((value): value is string => Boolean(value));
  return ids.length > 0 ? ids.join(" ") : undefined;
}
