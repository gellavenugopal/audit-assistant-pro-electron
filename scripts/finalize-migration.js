#!/usr/bin/env node

/**
 * Final Migration Script
 * Completes migration for all remaining files
 */

const fs = require('fs');
const path = require('path');

// Get all TypeScript/TSX files
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('dist')) {
      getAllFiles(filePath, fileList);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !filePath.includes('node_modules')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const replacements = [
  // Import replacements
  {
    pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
    replacement: "import { getSQLiteClient, auth as sqliteAuth, storage } from '@/integrations/sqlite/client'"
  },
  {
    pattern: /from\s*['"]@\/integrations\/supabase\/client['"]/g,
    replacement: "from '@/integrations/sqlite/client'"
  },
  {
    pattern: /from\s*['"]@supabase\/auth-helpers-react['"]/g,
    replacement: "from '@/integrations/sqlite/hooks'"
  },
  
  // Query replacements
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
  
  // Method replacements
  {
    pattern: /\.maybeSingle\(\)/g,
    replacement: '.single()'
  },
  {
    pattern: /useSupabaseClient\(\)/g,
    replacement: 'useSQLiteClient()'
  },
  
  // Boolean replacements
  {
    pattern: /\.eq\('is_active',\s*true\)/g,
    replacement: ".eq('is_active', 1)"
  },
  {
    pattern: /\.eq\('is_active',\s*false\)/g,
    replacement: ".eq('is_active', 0)"
  },
  {
    pattern: /\.eq\('is_read',\s*true\)/g,
    replacement: ".eq('is_read', 1)"
  },
  {
    pattern: /\.eq\('is_read',\s*false\)/g,
    replacement: ".eq('is_read', 0)"
  },
  {
    pattern: /\.eq\('locked',\s*true\)/g,
    replacement: ".eq('locked', 1)"
  },
  {
    pattern: /\.eq\('locked',\s*false\)/g,
    replacement: ".eq('locked', 0)"
  },
  {
    pattern: /is_read:\s*true/g,
    replacement: 'is_read: 1'
  },
  {
    pattern: /is_read:\s*false/g,
    replacement: 'is_read: 0'
  },
  {
    pattern: /locked:\s*true/g,
    replacement: 'locked: 1'
  },
  {
    pattern: /locked:\s*false/g,
    replacement: 'locked: 0'
  },
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Skip if already migrated
  if (content.includes('getSQLiteClient') && !content.includes('supabase') && !content.includes('@supabase')) {
    return false;
  }
  
  // Skip if no Supabase usage
  if (!content.includes('supabase') && !content.includes('@supabase')) {
    return false;
  }
  
  // Apply all replacements
  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }
  
  // Add db declaration if needed
  if (content.includes('db.from(') && !content.includes('const db = getSQLiteClient()')) {
    const importMatch = content.match(/import\s+.*?from\s+['"]@\/integrations\/sqlite\/client['"];?\s*\n/);
    if (importMatch) {
      const insertPos = importMatch.index + importMatch[0].length;
      content = content.slice(0, insertPos) + 
                '\nconst db = getSQLiteClient();\n' + 
                content.slice(insertPos);
    }
  }
  
  // Add .execute() to SELECT queries
  content = content.replace(
    /(const\s+\{\s*data[^}]*\}\s*=\s*await\s+db\.from\([^)]+\)\.select\([^)]+\))(?!\.execute\(\))(?!\.single\(\))(?!\.insert\(\))(?!\.update\(\))(?!\.delete\(\))/g,
    '$1.execute()'
  );
  
  // Fix update/delete order (update/delete should come after eq)
  content = content.replace(
    /db\.from\(([^)]+)\)\.update\(([^)]+)\)\.eq\(([^)]+)\)/g,
    'db.from($1).eq($3).update($2)'
  );
  
  content = content.replace(
    /db\.from\(([^)]+)\)\.delete\(\)\.eq\(([^)]+)\)/g,
    'db.from($1).eq($2).delete()'
  );
  
  // Remove insert arrays
  content = content.replace(/\.insert\(\[/g, '.insert(');
  content = content.replace(/\]\)/g, ')');
  
  // Remove real-time subscriptions
  content = content.replace(
    /supabase\.channel\([^)]+\)[\s\S]*?\.subscribe\(\);/g,
    '// Real-time subscriptions not available in SQLite'
  );
  
  content = content.replace(
    /supabase\.removeChannel\([^)]+\);/g,
    '// Real-time cleanup not needed'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Main execution
const srcDir = path.join(process.cwd(), 'src');
const files = getAllFiles(srcDir);

console.log('🚀 Finalizing SQLite Migration\n');
console.log(`Found ${files.length} files to check\n`);

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    if (migrateFile(file)) {
      migrated++;
      console.log(`✅ ${path.relative(process.cwd(), file)}`);
    } else {
      skipped++;
    }
  } catch (error) {
    errors++;
    console.error(`❌ ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Migration Complete!`);
console.log(`   Migrated: ${migrated} files`);
console.log(`   Skipped: ${skipped} files`);
console.log(`   Errors: ${errors} files`);
console.log(`${'='.repeat(60)}`);
console.log('\n⚠️  Please review the changes and test thoroughly!');
console.log('   Some files may need manual adjustments.');
