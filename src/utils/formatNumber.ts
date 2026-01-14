/**
 * Format a number in Indian numbering system (lakhs and crores)
 * @param value - The number to format
 * @returns Formatted string with Indian number format
 */
export function formatIndianNumber(value: number): string {
  if (value === 0) return '0';
  if (isNaN(value)) return '-';
  
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format a number as currency in Indian format
 * @param value - The number to format
 * @returns Formatted string with rupee symbol and Indian number format
 */
export function formatIndianCurrency(value: number): string {
  if (value === 0) return '₹0';
  if (isNaN(value)) return '-';
  
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  
  return `${sign}₹${absValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Sanitize numeric input by removing non-numeric characters except decimal point
 * @param value - The string value to sanitize
 * @returns Sanitized numeric string
 */
export function sanitizeNumeric(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/\D/g, "");
  const fracPart = parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "") : "";
  return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
}

/**
 * Parse a formatted Indian number string to a number
 * @param value - The formatted string to parse
 * @returns Parsed number value
 */
export function parseIndianNumber(value: string): number {
  const cleaned = sanitizeNumeric(value);
  return parseFloat(cleaned || "0");
}
