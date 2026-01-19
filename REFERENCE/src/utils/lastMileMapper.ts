/**
 * Last Mile Mapping Processor
 * Maps Trial Balance ledgers to Schedule III hierarchy
 */

export interface HierarchyInfo {
  primaryFieldValue: string;
  priorToPrimaryValue: string;
  hierarchyValues: string[];
  ledgerName: string;
  primaryColIdx: number;
}

export interface Map2Result {
  map2Resultant: string;
  matchedPriority: number | null;
  matchedKeyword: string;
  multipleMatches: boolean;
  matchedKeywordsList: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allCandidates: any[];
}

export interface Sch3Result {
  faceItem: string;
  faceNote: string;
  subnote: string;
  subnote1: string;
  subnote2: string;
  subnote3: string;
  ambiguous: boolean;
  error: string;
  usedKeyword?: string;
}

export interface LastMileMappingResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Preserve original TB columns
  Tally_Pre_Primary: string;
  Primary_Field_Value: string;
  Prior_To_Primary_Value: string;
  Map1_FaceNote: string;
  Map2_Resultant: string;
  MatchedPriority: number | null;
  MatchedKeyword: string;
  UsedKeyword: string;
  MultipleMatches: boolean;
  AmbiguousSch3Match: boolean;
  'Face Item': string;
  'Face Note': string;
  SubNote: string;
  SubNote1: string;
  SubNote2: string;
  SubNote3: string;
  MappingStatus: 'OK' | 'PARTIAL' | 'ERROR';
  MappingError: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractHierarchyInfo(tbRow: any): HierarchyInfo {
  const hierCols = [
    'Parent', 'Group.$Parent', 'Group.$Parent.1', 'Group.$Parent.2',
    'Group.$Parent.3', 'Group.$Parent.4', 'Group.$Parent.5',
    'Group.$Parent.6', 'Group.$Parent.7', 'Group.$Parent.8'
  ];

  const hierarchyValues: string[] = [];
  let primaryColIdx = -1;

  // Helper function to check if a string contains the Primary marker
  const containsPrimaryMarker = (str: string): boolean => {
    // Check for various representations of the Unicode character \u0004 followed by "Primary"
    return str.includes('_x0004_ Primary') || 
           str.includes('\u0004Primary') ||
           str.includes('\u0004 Primary') ||
           /[\x00-\x1F]\s*Primary/i.test(str); // Any control character followed by optional space and "Primary"
  };

  // Build hierarchy list - maintain index alignment by storing empty strings
  hierCols.forEach((col, idx) => {
    const value = tbRow[col];
    let valueStr = '';
    
    if (value !== undefined && value !== null) {
      valueStr = String(value).trim();
      
      // Check if this column contains the Primary marker
      if (containsPrimaryMarker(valueStr)) {
        primaryColIdx = idx;
      }
    }
    
    // Always push to maintain index alignment
    hierarchyValues.push(valueStr);
  });

  let primaryFieldValue = '';
  let priorToPrimaryValue = '';

  // If we found a Primary marker
  if (primaryColIdx >= 0) {
    // PRIMARY_FIELD_VALUE = value from column BEFORE Primary marker
    if (primaryColIdx > 0) {
      primaryFieldValue = hierarchyValues[primaryColIdx - 1] || '';
    }
    
    // PRIOR_TO_PRIMARY_VALUE = value from TWO columns before Primary marker
    if (primaryColIdx > 1) {
      priorToPrimaryValue = hierarchyValues[primaryColIdx - 2] || '';
    }
  } else {
    // Fallback: use last non-empty hierarchy value that doesn't contain Primary marker
    for (let i = hierarchyValues.length - 1; i >= 0; i--) {
      const val = hierarchyValues[i];
      if (val && !containsPrimaryMarker(val)) {
        primaryFieldValue = val;
        break;
      }
    }
  }

  const ledgerName = String(tbRow['Name'] || '').trim();

  // Debug log - show first 5 rows for verification
  const nonEmptyCount = hierarchyValues.filter(v => v).length;
  if (nonEmptyCount > 0) {
    const firstNonEmptyIdx = hierarchyValues.findIndex(v => v);
    if (firstNonEmptyIdx >= 0 && firstNonEmptyIdx < 5) {
      console.log('=== HIERARCHY DEBUG (' + ledgerName + ') ===');
      console.log('All hierarchy values:', hierarchyValues);
      console.log('Raw hierarchy values (stringified):', hierarchyValues.map(v => JSON.stringify(v)));
      console.log('Primary marker found at index:', primaryColIdx);
      if (primaryColIdx >= 0) {
        const primaryMarkerValue = hierarchyValues[primaryColIdx];
        console.log('Value WITH Primary marker:', JSON.stringify(primaryMarkerValue));
        console.log('Primary marker char codes:', Array.from(primaryMarkerValue).map((c, i) => `[${i}:${c.charCodeAt(0)}]`).join(' '));
        console.log('Value BEFORE Primary (extracted):', JSON.stringify(primaryFieldValue));
      }
      console.log('Final PRIMARY_FIELD_VALUE:', primaryFieldValue);
    }
  }

  return {
    primaryFieldValue,
    priorToPrimaryValue,
    hierarchyValues,
    ledgerName,
    primaryColIdx
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function map1Lookup(tallyPrePrimary: string, map1Data: any[]): string {
  const tallyLower = tallyPrePrimary.toLowerCase().trim();

  if (!tallyLower) {
    return 'Not Mapped';
  }

  for (const map1Row of map1Data) {
    const map1Key = String(map1Row['Tally Pre-Primary'] || '').toLowerCase().trim();
    if (map1Key === tallyLower) {
      const result = map1Row['Mapping1 Resultant'];
      return result ? String(result).trim() : 'Not Mapped';
    }
  }

  return 'Not Mapped';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function map2KeywordSearch(hierInfo: HierarchyInfo, map2Data: any[]): Map2Result {
  if (map2Data.length === 0) {
    console.warn('map2KeywordSearch: map2Data is empty!');
  }
  
  const searchFields: Array<[string, string]> = [];

  if (hierInfo.primaryFieldValue) {
    searchFields.push(['primary', hierInfo.primaryFieldValue]);
  }
  if (hierInfo.priorToPrimaryValue) {
    searchFields.push(['prior', hierInfo.priorToPrimaryValue]);
  }

  const primaryIdx = hierInfo.primaryColIdx;
  hierInfo.hierarchyValues.forEach((val, idx) => {
    if (val && !val.includes('_x0004_ Primary')) {
      if (primaryIdx < 0 || (idx !== primaryIdx - 1 && idx !== primaryIdx - 2)) {
        searchFields.push(['hierarchy', val]);
      }
    }
  });

  if (hierInfo.ledgerName) {
    searchFields.push(['ledger', hierInfo.ledgerName]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCandidates: any[] = [];

  for (const [fieldType, searchField] of searchFields) {
    const searchFieldLower = searchField.toLowerCase().trim();

    for (let map2Idx = 0; map2Idx < map2Data.length; map2Idx++) {
      const map2Row = map2Data[map2Idx];
      const keywordStr = String(map2Row['Keyword'] || '').trim();
      let priority = map2Row['Priority'];

      try {
        priority = priority ? parseInt(String(priority)) : 999;
      } catch {
        priority = 999;
      }

      const keywords = keywordStr.split('|').map(k => k.trim()).filter(k => k);

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

        if (regex.test(searchFieldLower)) {
          const fieldScore = { primary: 0, prior: 1, hierarchy: 2, ledger: 3 }[fieldType] || 4;

          allCandidates.push({
            map2Resultant: String(map2Row['Mapping2 Resultant'] || '').trim(),
            priority,
            keyword,
            keywordLength: keyword.length,
            rowOrder: map2Idx,
            fieldScore,
            fieldType
          });
        }
      }
    }
  }

  if (allCandidates.length === 0) {
    return {
      map2Resultant: 'Not Mapped',
      matchedPriority: null,
      matchedKeyword: '',
      multipleMatches: false,
      matchedKeywordsList: [],
      allCandidates: []
    };
  }

  allCandidates.sort((a, b) => {
    if (a.keywordLength !== b.keywordLength) return b.keywordLength - a.keywordLength;
    if (a.fieldScore !== b.fieldScore) return a.fieldScore - b.fieldScore;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.rowOrder - b.rowOrder;
  });

  const winner = allCandidates[0];
  const multipleMatches = allCandidates.slice(1).some(
    m => m.priority === winner.priority && m.keywordLength === winner.keywordLength
  );

  return {
    map2Resultant: winner.map2Resultant,
    matchedPriority: winner.priority,
    matchedKeyword: winner.keyword,
    multipleMatches,
    matchedKeywordsList: multipleMatches ? allCandidates.filter(
      m => m.priority === winner.priority && m.keywordLength === winner.keywordLength
    ).map(m => m.keyword) : [winner.keyword],
    allCandidates
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map2KeywordSearchNameOnly(ledgerName: string, map2Data: any[]): Map2Result {
  const searchFieldLower = ledgerName.toLowerCase().trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidateMatches: any[] = [];

  for (let map2Idx = 0; map2Idx < map2Data.length; map2Idx++) {
    const map2Row = map2Data[map2Idx];
    const keywordStr = String(map2Row['Keyword'] || '').trim();
    let priority = map2Row['Priority'] || 999;

    try {
      priority = priority ? parseInt(String(priority)) : 999;
    } catch {
      priority = 999;
    }

    const keywords = keywordStr.split('|').map(k => k.trim()).filter(k => k);

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const pattern = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      if (pattern.test(searchFieldLower)) {
        candidateMatches.push({
          map2Resultant: String(map2Row['Mapping2 Resultant'] || '').trim(),
          priority,
          keyword,
          keywordLength: keyword.length,
          rowOrder: map2Idx,
          fieldScore: 0,
          fieldType: 'name_fallback'
        });
      }
    }
  }

  if (candidateMatches.length === 0) {
    return {
      map2Resultant: 'Not Mapped',
      matchedPriority: null,
      matchedKeyword: '',
      multipleMatches: false,
      matchedKeywordsList: [],
      allCandidates: []
    };
  }

  candidateMatches.sort((a, b) => {
    if (b.keywordLength !== a.keywordLength) return b.keywordLength - a.keywordLength;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.rowOrder - b.rowOrder;
  });

  const winner = candidateMatches[0];

  return {
    map2Resultant: winner.map2Resultant,
    matchedPriority: winner.priority,
    matchedKeyword: winner.keyword + ' (name)',
    multipleMatches: false,
    matchedKeywordsList: [],
    allCandidates: candidateMatches
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getValidSubnotesForFacenote(faceNote: string, sch3Data: any[]): Set<string> {
  const faceNoteLower = faceNote.toLowerCase().trim();
  const validSubnotes = new Set<string>();

  for (const row of sch3Data) {
    if (String(row['Face Note'] || '').toLowerCase().trim() === faceNoteLower) {
      ['SubNote', 'SubNote1', 'SubNote2', 'SubNote3'].forEach(col => {
        const val = String(row[col] || '').trim();
        if (val) {
          validSubnotes.add(val.toLowerCase().trim());
        }
      });
    }
  }

  return validSubnotes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trySch3Match(faceNote: string, map2Resultant: string, sch3Data: any[]): Sch3Result {
  const faceNoteLower = faceNote.toLowerCase().trim();
  const filteredSch3 = sch3Data.filter(
    row => String(row['Face Note'] || '').toLowerCase().trim() === faceNoteLower
  );

  if (filteredSch3.length === 0) {
    return {
      faceItem: 'Not Mapped',
      faceNote,
      subnote: 'Not Mapped',
      subnote1: 'Not Mapped',
      subnote2: 'Not Mapped',
      subnote3: 'Not Mapped',
      ambiguous: false,
      error: `Face Note "${faceNote}" not found in Sch3`
    };
  }

  const map2Lower = map2Resultant.toLowerCase().trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedRows: any[] = [];

  for (const sch3Row of filteredSch3) {
    const cols = ['SubNote', 'SubNote1', 'SubNote2', 'SubNote3'];
    for (const col of cols) {
      if (String(sch3Row[col] || '').toLowerCase().trim() === map2Lower) {
        matchedRows.push(sch3Row);
        break;
      }
    }
  }

  if (matchedRows.length === 0) {
    return {
      faceItem: 'Not Mapped',
      faceNote,
      subnote: 'Not Mapped',
      subnote1: 'Not Mapped',
      subnote2: 'Not Mapped',
      subnote3: 'Not Mapped',
      ambiguous: false,
      error: `Map2_Resultant "${map2Resultant}" not valid under Face Note "${faceNote}"`
    };
  }

  const winner = matchedRows[0];
  return {
    faceItem: String(winner['Face Item'] || '').trim(),
    faceNote: String(winner['Face Note'] || '').trim(),
    subnote: String(winner['SubNote'] || '').trim(),
    subnote1: String(winner['SubNote1'] || '').trim(),
    subnote2: String(winner['SubNote2'] || '').trim(),
    subnote3: String(winner['SubNote3'] || '').trim(),
    ambiguous: matchedRows.length > 1,
    error: ''
  };
}

export function sch3ResolveWithFallback(
  faceNote: string,
  map2Result: Map2Result,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sch3Data: any[]
): Sch3Result {
  if (faceNote === 'Not Mapped') {
    return {
      faceItem: 'Not Mapped',
      faceNote,
      subnote: 'Not Mapped',
      subnote1: 'Not Mapped',
      subnote2: 'Not Mapped',
      subnote3: 'Not Mapped',
      ambiguous: false,
      error: 'Face Note not mapped',
      usedKeyword: ''
    };
  }

  const validSubnotes = getValidSubnotesForFacenote(faceNote, sch3Data);

  // Strategy 1: Try all candidates
  for (let idx = 0; idx < map2Result.allCandidates.length; idx++) {
    const candidate = map2Result.allCandidates[idx];
    if (candidate.map2Resultant && candidate.map2Resultant !== 'Not Mapped') {
      const result = trySch3Match(faceNote, candidate.map2Resultant, sch3Data);
      if (!result.error) {
        result.usedKeyword = candidate.keyword;
        return result;
      }
    }
  }

  // Strategy 2: Try matching against valid subnotes
  for (const candidate of map2Result.allCandidates) {
    if (candidate.map2Resultant && candidate.map2Resultant !== 'Not Mapped') {
      const candidateLower = candidate.map2Resultant.toLowerCase().trim();
      if (validSubnotes.has(candidateLower)) {
        const result = trySch3Match(faceNote, candidate.map2Resultant, sch3Data);
        if (!result.error) {
          result.usedKeyword = candidate.keyword;
          return result;
        }
      }
    }
  }

  return {
    faceItem: 'Not Mapped',
    faceNote,
    subnote: 'Not Mapped',
    subnote1: 'Not Mapped',
    subnote2: 'Not Mapped',
    subnote3: 'Not Mapped',
    ambiguous: false,
    error: `Tried ${map2Result.allCandidates.length} candidates. None valid under Face Note "${faceNote}"`,
    usedKeyword: map2Result.matchedKeyword
  };
}

export function processLastMileMapping(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tbData: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sch3Data: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map1Data: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map2Data: any[]
): LastMileMappingResult[] {
  console.log('Last Mile Mapping - Data loaded:', {
    tbData: tbData.length,
    sch3Data: sch3Data.length,
    map1Data: map1Data.length,
    map2Data: map2Data.length
  });

  // Debug: Show first few Map1 entries
  if (map1Data.length > 0) {
    console.log('Map1 sample entries (first 3):');
    map1Data.slice(0, 3).forEach((row, idx) => {
      console.log(`  [${idx}] Tally Pre-Primary: "${row['Tally Pre-Primary']}" => Mapping1 Resultant: "${row['Mapping1 Resultant']}"`);
    });
  }

  const results: LastMileMappingResult[] = [];

  for (const tbRow of tbData) {
    const hierInfo = extractHierarchyInfo(tbRow);
    const tallyPrePrimary = hierInfo.primaryFieldValue;
    const faceNoteFromMap1 = map1Lookup(tallyPrePrimary, map1Data);
    const map2Result = map2KeywordSearch(hierInfo, map2Data);
    let sch3Result = sch3ResolveWithFallback(faceNoteFromMap1, map2Result, sch3Data);

    // Ultimate fallback: try Name column exclusively
    if (sch3Result.error && hierInfo.ledgerName) {
      const nameOnlyResult = map2KeywordSearchNameOnly(hierInfo.ledgerName, map2Data);
      if (nameOnlyResult.map2Resultant !== 'Not Mapped') {
        const nameSch3Result = sch3ResolveWithFallback(faceNoteFromMap1, nameOnlyResult, sch3Data);
        if (!nameSch3Result.error) {
          sch3Result = nameSch3Result;
        }
      }
    }

    let mappingStatus: 'OK' | 'PARTIAL' | 'ERROR' = 'OK';
    let mappingError = sch3Result.error;

    if (faceNoteFromMap1 === 'Not Mapped') {
      mappingStatus = 'ERROR';
      if (!mappingError) mappingError = 'Map1 lookup failed';
    } else if (map2Result.map2Resultant === 'Not Mapped') {
      mappingStatus = 'PARTIAL';
      if (!mappingError) mappingError = 'Map2 keyword search failed';
    } else if (sch3Result.error) {
      mappingStatus = 'ERROR';
    }

    results.push({
      ...tbRow,
      Tally_Pre_Primary: tallyPrePrimary,
      Primary_Field_Value: hierInfo.primaryFieldValue,
      Prior_To_Primary_Value: hierInfo.priorToPrimaryValue,
      Map1_FaceNote: faceNoteFromMap1,
      Map2_Resultant: map2Result.map2Resultant,
      MatchedPriority: map2Result.matchedPriority,
      MatchedKeyword: map2Result.matchedKeyword,
      UsedKeyword: sch3Result.usedKeyword || map2Result.matchedKeyword,
      MultipleMatches: map2Result.multipleMatches,
      AmbiguousSch3Match: sch3Result.ambiguous,
      'Face Item': sch3Result.faceItem,
      'Face Note': sch3Result.faceNote,
      SubNote: sch3Result.subnote,
      SubNote1: sch3Result.subnote1,
      SubNote2: sch3Result.subnote2,
      SubNote3: sch3Result.subnote3,
      MappingStatus: mappingStatus,
      MappingError: mappingError
    });
  }

  return results;
}
