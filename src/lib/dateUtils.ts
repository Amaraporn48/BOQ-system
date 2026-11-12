/**
 * Parses an optional date value into a valid Date or null.
 * Returns an error message if a non-empty value cannot be parsed as a valid date.
 */
export function parseOptionalDate(
  value: unknown,
  fieldLabel: string
): { date: Date | null | undefined; error?: string } {
  if (value === undefined) {
    return { date: undefined };
  }
  if (value === null || value === '') {
    return { date: null };
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return { date: undefined, error: `รูปแบบวันที่ไม่ถูกต้อง (${fieldLabel})` };
  }
  return { date: parsed };
}
