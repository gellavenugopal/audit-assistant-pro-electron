/**
 * Fuzzy String Matching Utility
 * For intelligent classification of stock items and ledgers
 */

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score between 0 (no match) and 1 (perfect match)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Create matrix
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Convert distance to similarity score
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
}

/**
 * Check if a string contains any of the keywords (case-insensitive)
 * Supports partial matching and word boundaries
 */
export function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return lowerText.includes(lowerKeyword);
  });
}

/**
 * Find best matching category using fuzzy matching
 */
export function fuzzyMatchCategory(
  text: string,
  categories: { category: string; keywords: string[] }[],
  threshold: number = 0.6
): string | null {
  const lowerText = text.toLowerCase();
  
  // First, try exact keyword matching
  for (const { category, keywords } of categories) {
    if (containsKeyword(lowerText, keywords)) {
      return category;
    }
  }
  
  // Then try similarity-based matching
  let bestMatch: { category: string; score: number } | null = null;
  
  for (const { category, keywords } of categories) {
    for (const keyword of keywords) {
      const similarity = calculateSimilarity(lowerText, keyword);
      
      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { category, score: similarity };
      }
    }
  }
  
  return bestMatch ? bestMatch.category : null;
}

/**
 * Stock Category Classification Rules for Manufacturing Business
 */
export const MANUFACTURING_STOCK_RULES = [
  {
    category: 'Raw Material',
    keywords: ['raw', 'raw material', 'raw materials', 'rm', 'r.m', 'r.m.', 'rawmat']
  },
  {
    category: 'Work-in-Progress',
    keywords: ['wip', 'w.i.p', 'w.i.p.', 'work in progress', 'work-in-progress', 'semi finished', 'semi-finished']
  },
  {
    category: 'Finished Goods',
    keywords: ['finished', 'finished goods', 'fg', 'f.g', 'f.g.', 'final goods', 'final product']
  },
  {
    category: 'Packaging Material',
    keywords: ['packaging', 'packing', 'pm', 'p.m', 'p.m.', 'packing material', 'packaging material', 'wrapping']
  },
  {
    category: 'Consumables',
    keywords: ['consumable', 'consumables', 'stores', 'supplies', 'consumable stores']
  },
  {
    category: 'Spare Parts',
    keywords: ['spare', 'spares', 'spare part', 'spare parts', 'components']
  }
];

/**
 * Classify stock item based on business type and stock group name
 */
export function classifyStockItem(
  itemName: string,
  stockGroup: string,
  businessType: string
): string {
  // Trading business: Always Stock-in-Trade
  if (businessType === 'Trading') {
    return 'Stock-in-Trade';
  }
  
  // Manufacturing business: Use fuzzy matching
  if (businessType === 'Manufacturing') {
    // Try to match on stock group first
    const groupMatch = fuzzyMatchCategory(stockGroup, MANUFACTURING_STOCK_RULES, 0.6);
    if (groupMatch) return groupMatch;
    
    // Then try item name
    const itemMatch = fuzzyMatchCategory(itemName, MANUFACTURING_STOCK_RULES, 0.6);
    if (itemMatch) return itemMatch;
    
    // Default for manufacturing
    return 'Unclassified'; // Will prompt user
  }
  
  // Other businesses: Return unclassified for manual selection
  return 'Unclassified';
}
