#!/usr/bin/env node

/**
 * Batch Migration Script for Hooks
 * Automatically migrates remaining hook files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/hooks/*.ts', {
  ignore: ['**/node_modules/**']
});

const replacements = [
  {
    pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
    replacement: "import { getSQLiteClient } from '@/integrations/sqlite/client'"
  },
  {
    pattern: /supabase\.from\(/g,
    replacement: 'db.from('
  },
  {
    pattern: /supabase\.auth\./g,
    replacement: 'sqliteAuth.'
  },
  {
    pattern: /supabase\.storage\./g,
    replacement: 'storage.'
  },
  {
    pattern: /\.maybeSingle\(\)/g,
    replacement: '.single()'
  },
  {
    pattern: /\.eq\('is_active',\s*true\)/g,
    replacement: ".eq('is_active', 1)"
  },
  {
    pattern: /\.eq\('is_active',\s*false\)/g,
    replacement: ".eq('is_active', 0)"
  }
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip if already migrated
  if (content.includes('getSQLiteClient') && !content.includes('supabase')) {
    console.log(`⏭️  ${path.basename(filePath)} - Already migrated`);
    return false;
  }
  
  // Skip if no Supabase usage
  if (!content.includes('supabase') && !content.includes('@supabase')) {
    return false;
  }
  
  // Apply replacements
  for (const { pattern, replacement } of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }
  
  // Add db declaration if needed
  if (content.includes('db.from(') && !content.includes('const db = getSQLiteClient()')) {
    // Find import line
    const importMatch = content.match(/import\s+.*?from\s+['"]@\/integrations\/sqlite\/client['"];?\s*\n/);
    if (importMatch) {
      const insertPos = importMatch.index + importMatch[0].length;
      content = content.slice(0, insertPos) + 
                '\nconst db = getSQLiteClient();\n' + 
                content.slice(insertPos);
      modified = true;
    }
  }
  
  // Add .execute() to SELECT queries (simple cases)
  const selectPattern = /(const\s+\{\s*data[^}]*\}\s*=\s*await\s+db\.from\([^)]+\)\.select\([^)]+\))(?!\.execute\(\))(?!\.single\(\))/g;
  if (selectPattern.test(content)) {
    content = content.replace(selectPattern, '$1.execute()');
    modified = true;
  }
  
  // Remove real-time subscriptions
  if (content.includes('supabase.channel') || content.includes('.subscribe()')) {
    content = content.replace(
      /supabase\.channel\([^)]+\)[\s\S]*?\.subscribe\(\);/g,
      '// Real-time subscriptions not available in SQLite'
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} - Migrated`);
    return true;
  }
  
  return false;
}

console.log('🚀 Batch Migrating Hook Files\n');
let migrated = 0;

for (const file of files) {
  if (migrateFile(file)) {
    migrated++;
  }
}

console.log(`\n✅ Migrated ${migrated} files`);
console.log('⚠️  Please review and test the changes!');
