import fs from 'fs';

const content = fs.readFileSync('./src/data/scheduleIIIDefaultRules.ts', 'utf8');

// Extract Group Rules
const groupPattern = /\{\s*ruleId:\s*'([^']+)',\s*tallyGroupName:\s*'([^']+)',\s*tallyParentGroup:\s*(?:'([^']*)'|null),\s*mapsToCode:\s*'([^']+)',\s*mapsToDescription:\s*'([^']+)',\s*notes:\s*(?:'([^']*)'|null)\s*\}/g;

// Extract Keyword Rules
const keywordPattern = /\{\s*ruleId:\s*'([^']+)',\s*keywordPattern:\s*'([^']+)',\s*matchType:\s*'([^']+)',\s*mapsToCode:\s*'([^']+)',\s*mapsToDescription:\s*'([^']+)',\s*priority:\s*(\d+)\s*\}/g;

// Extract Override Rules
const overridePattern = /\{\s*ruleId:\s*'([^']+)',\s*exactLedgerName:\s*'([^']+)',\s*currentTallyGroup:\s*(?:'([^']*)'|null),\s*overrideToCode:\s*'([^']+)',\s*overrideToDescription:\s*'([^']+)',\s*reasonForOverride:\s*'([^']*)',\s*effectiveDate:\s*(?:'([^']*)'|null)\s*\}/g;

const groupMatches = [...content.matchAll(groupPattern)];
const keywordMatches = [...content.matchAll(keywordPattern)];
const overrideMatches = [...content.matchAll(overridePattern)];

// Output CSV
let csv = '';

// Group Rules CSV
csv += '=== GROUP RULES ===\n';
csv += 'RuleID,TallyGroupName,TallyParentGroup,MapsToCode,MapsToDescription,Notes\n';
groupMatches.forEach(m => {
  csv += `${m[1]},"${m[2]}","${m[3] || ''}",${m[4]},"${m[5]}","${m[6] || ''}"\n`;
});

csv += '\n=== KEYWORD RULES ===\n';
csv += 'RuleID,KeywordPattern,MatchType,MapsToCode,MapsToDescription,Priority\n';
keywordMatches.forEach(m => {
  csv += `${m[1]},"${m[2]}","${m[3]}",${m[4]},"${m[5]}",${m[6]}\n`;
});

csv += '\n=== OVERRIDE RULES ===\n';
csv += 'RuleID,ExactLedgerName,CurrentTallyGroup,OverrideToCode,OverrideToDescription,ReasonForOverride,EffectiveDate\n';
overrideMatches.forEach(m => {
  csv += `${m[1]},"${m[2]}","${m[3] || ''}",${m[4]},"${m[5]}","${m[6]}","${m[7] || ''}"\n`;
});

// Write to file
fs.writeFileSync('schedule_iii_rules.csv', csv);
console.log('Rules extracted successfully!');
console.log(`Total Group Rules: ${groupMatches.length}`);
console.log(`Total Keyword Rules: ${keywordMatches.length}`);
console.log(`Total Override Rules: ${overrideMatches.length}`);
console.log('Output file: schedule_iii_rules.csv');
