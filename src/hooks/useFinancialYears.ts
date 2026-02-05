import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

export interface FinancialYear {
  id: string;
  year_code: string;
  display_name: string;
  is_active: boolean;
}

/**
 * Generate financial years from 2017 to current year + 1
 * Financial year format: YYYY-YY (e.g., 2024-25)
 */
function generateFinancialYears(): FinancialYear[] {
  const currentYear = new Date().getFullYear();
  const years: FinancialYear[] = [];
  
  // Generate from 2017 to current year + 1
  for (let year = currentYear + 1; year >= 2017; year--) {
    const nextYear = year + 1;
    const yearCode = `${year}-${String(nextYear).slice(2)}`;
    const displayName = `FY ${year}-${String(nextYear).slice(2)}`;
    
    years.push({
      id: yearCode,
      year_code: yearCode,
      display_name: displayName,
      is_active: true,
    });
  }
  
  return years;
}

export function useFinancialYears() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancialYears = async () => {
    setLoading(true);
    try {
      // Try to fetch from database first
      const { data, error } = await db
        .from('financial_years')
        .select('id, year_code, display_name, is_active')
        .eq('is_active', 1)
        .execute();

      if (error) {
        console.error('Error fetching financial years from database:', error);
        // Fallback to generated years
        setFinancialYears(generateFinancialYears());
      } else if (!data || data.length === 0) {
        // If table is empty, use generated years
        console.log('No financial years in database, using generated years (2017 to current year)');
        setFinancialYears(generateFinancialYears());
      } else {
        // Sort by year_code descending (most recent first)
        const sortedData = [...data].sort((a, b) => b.year_code.localeCompare(a.year_code));
        setFinancialYears(sortedData);
      }
    } catch (error) {
      console.error('Error fetching financial years:', error);
      // Fallback to generated years
      setFinancialYears(generateFinancialYears());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  return { financialYears, loading, refetch: fetchFinancialYears };
}
