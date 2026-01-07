/**
 * Convert financial year format (e.g., "2024-25") to report date format (e.g., "31 March 2025")
 * In India, financial year is from April 1 to March 31, so FY 2024-25 ends on 31 March 2025
 * @param financialYear - Financial year in format "YYYY-YY" (e.g., "2024-25")
 * @returns Formatted date as "31 March YYYY"
 */
export function formatFinancialYearAsReportDate(financialYear: string): string {
  if (!financialYear) return '';
  
  // Extract the end year from format "2024-25"
  const parts = financialYear.split('-');
  if (parts.length !== 2) return financialYear; // Return as-is if format is unexpected
  
  const endYear = parts[1];
  // Convert "25" to "2025"
  const fullYear = endYear.length === 2 ? `20${endYear}` : endYear;
  
  return `31 March ${fullYear}`;
}
