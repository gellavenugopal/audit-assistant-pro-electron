#!/usr/bin/env node

/**
 * Automated Migration Script
 * Converts all Supabase imports to SQLite
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = [
  {
    // Replace Supabase client import
    pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
    replacement: "import { getSQLiteClient } from '@/integrations/sqlite/client'"
  },
  {
    // Replace Supabase hook imports
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@supabase\/auth-helpers-react['"]/g,
    replacement: "import { $1 } from '@/integrations/sqlite/hooks'"
  },
  {
    // Replace supabase.from(...) with db.from(...)
    pattern: /supabase\.from\(/g,
    replacement: 'db.from('
  },
  {
    // Replace supabase.auth with sqliteAuth or auth
    pattern: /supabase\.auth\./g,
    replacement: 'sqliteAuth.'
  },
  {
    // Replace supabase.storage with storage
    pattern: /supabase\.storage\./g,
    replacement: 'storage.'
  },
  {
    // Add db const declaration after imports
    pattern: /(import.*?from.*?['"];?\s*\n\n)/,
    replacement: "$1const db = getSQLiteClient();\n\n",
    onlyOnce: true
  }
];

function migrateFile(filePath) {
  console.log(`Migrating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file uses Supabase
  if (!content.includes('supabase') && !content.includes('@supabase')) {
    console.log(`  ⏭️  Skipped (no Supabase usage)`);
    return;
  }
  
  // Apply replacements
  for (const { pattern, replacement, onlyOnce } of replacements) {
    if (onlyOnce) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    } else {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
  }
  
  // Additional smart replacements
  
  // If file has getSQLiteClient import, add db declaration if not exists
  if (content.includes('getSQLiteClient') && !content.includes('const db = getSQLiteClient()')) {
    // Find first function or component and add db const before it
    const functionMatch = content.match(/(export\s+(function|const)\s+\w+|function\s+\w+)/);
    if (functionMatch) {
      const insertPos = functionMatch.index;
      content = content.slice(0, insertPos) + 
                'const db = getSQLiteClient();\n\n' + 
                content.slice(insertPos);
      modified = true;
    }
  }
  
  // Add sqliteAuth import if needed
  if (content.includes('sqliteAuth.') && !content.includes('auth as sqliteAuth')) {
    content = content.replace(
      "import { getSQLiteClient } from '@/integrations/sqlite/client'",
      "import { getSQLiteClient, auth as sqliteAuth } from '@/integrations/sqlite/client'"
    );
    modified = true;
  }
  
  // Add storage import if needed
  if (content.includes('storage.') && !content.includes('storage }')) {
    content = content.replace(
      "import { getSQLiteClient",
      "import { getSQLiteClient, storage"
    );
    modified = true;
  }
  
  // Replace .maybeSingle() with .single()
  if (content.includes('.maybeSingle()')) {
    content = content.replace(/\.maybeSingle\(\)/g, '.single()');
    modified = true;
  }
  
  // Add .execute() to queries that need it
  const queryPattern = /db\.from\([^)]+\)(?:\.[a-z]+\([^)]*\))*(?!\.execute\(\))/g;
  if (queryPattern.test(content)) {
    // This is complex - we'll handle it manually
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Migrated`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
}

function main() {
  console.log('🚀 Starting SQLite Migration');
  console.log('=' . repeat(60));
  
  // Find all TypeScript/JavaScript files in src
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  console.log(`Found ${files.length} files to check\n`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const file of files) {
    try {
      const before = fs.readFileSync(file, 'utf8');
      migrateFile(file);
      const after = fs.readFileSync(file, 'utf8');
      
      if (before !== after) {
        migrated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration Complete`);
  console.log(`   Migrated: ${migrated} files`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`   Total: ${files.length} files`);
  console.log('='.repeat(60));
  console.log('\n⚠️  Please review the changes and test thoroughly!');
  console.log('   Some files may need manual adjustments for .execute() calls');
}

main();
