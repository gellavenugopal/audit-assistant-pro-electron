#!/usr/bin/env node

/**
 * Complete Migration Script
 * Migrates all remaining Supabase files to SQLite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const replacements = [
    {
        pattern: /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
        replacement: "import { getSQLiteClient, auth as sqliteAuth, storage } from '@/integrations/sqlite/client'"
    },
    {
        pattern: /from\s*['"]@\/integrations\/supabase\/client['"]/g,
        replacement: "from '@/integrations/sqlite/client'"
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
        pattern: /locked:\s*false/g,
        replacement: 'locked: 0'
    },
    {
        pattern: /locked:\s*true/g,
        replacement: 'locked: 1'
    },
    {
        pattern: /from\s*['"]@supabase\/auth-helpers-react['"]/g,
        replacement: "from '@/integrations/sqlite/hooks'"
    },
    {
        pattern: /useSupabaseClient\(\)/g,
        replacement: 'useSQLiteClient()'
    }
];

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Skip if already migrated
    if (content.includes('getSQLiteClient') && !content.includes('supabase') && !content.includes('@supabase')) {
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
        const importMatch = content.match(/import\s+.*?from\s+['"]@\/integrations\/sqlite\/client['"];?\s*\n/);
        if (importMatch) {
            const insertPos = importMatch.index + importMatch[0].length;
            content = content.slice(0, insertPos) +
                '\nconst db = getSQLiteClient();\n' +
                content.slice(insertPos);
            modified = true;
        }
    }

    // Add .execute() to SELECT queries (simple pattern)
    content = content.replace(
        /(const\s+\{\s*data[^}]*\}\s*=\s*await\s+db\.from\([^)]+\)\.select\([^)]+\))(?!\.execute\(\))(?!\.single\(\))(?!\.insert\(\))(?!\.update\(\))(?!\.delete\(\))/g,
        '$1.execute()'
    );

    // Fix update/delete order
    content = content.replace(
        /db\.from\(([^)]+)\)\.update\(([^)]+)\)\.eq\(([^)]+)\)/g,
        'db.from($1).eq($3).update($2)'
    );

    content = content.replace(
        /db\.from\(([^)]+)\)\.delete\(\)\.eq\(([^)]+)\)/g,
        'db.from($1).eq($2).delete()'
    );

    // Remove real-time subscriptions
    content = content.replace(
        /supabase\.channel\([^)]+\)[\s\S]*?\.subscribe\(\);/g,
        '// Real-time subscriptions not available in SQLite'
    );

    content = content.replace(
        /supabase\.removeChannel\([^)]+\);/g,
        '// Real-time cleanup not needed'
    );

    // Fix insert arrays to objects
    content = content.replace(/\.insert\(\[/g, '.insert(');
    content = content.replace(/\]\)/g, ')');

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }

    return false;
}

// Get all files to migrate
const files = [
    ...glob.sync('src/hooks/*.ts'),
    ...glob.sync('src/pages/*.tsx'),
    ...glob.sync('src/components/**/*.tsx'),
    ...glob.sync('src/contexts/*.tsx'),
    ...glob.sync('src/utils/*.ts')
].filter(f => !f.includes('node_modules'));

console.log('🚀 Migrating remaining files...\n');
let migrated = 0;

for (const file of files) {
    try {
        if (migrateFile(file)) {
            migrated++;
            console.log(`✅ ${path.basename(file)}`);
        }
    } catch (error) {
        console.error(`❌ ${path.basename(file)}: ${error.message}`);
    }
}

console.log(`\n✅ Migrated ${migrated} files`);
console.log('⚠️  Please review and test!');
