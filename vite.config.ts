import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Vite plugin to exclude SQLite from bundling
function excludeSQLite() {
  return {
    name: 'exclude-sqlite',
    resolveId(id: string) {
      // Exclude sqlite directory and Node.js modules
      if (id.includes('sqlite/database-manager') || 
          id.includes('sqlite/access-control') ||
          id === 'better-sqlite3' ||
          id === 'bcrypt' ||
          id === 'fs' ||
          id === 'path' ||
          id === 'crypto') {
        return { id, external: true };
      }
    },
    load(id: string) {
      // Return empty module for excluded files
      if (id.includes('sqlite/database-manager') || 
          id.includes('sqlite/access-control')) {
        return 'export default {};';
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "./",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "^/(api|accounts)": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      }
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    excludeSQLite()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => {
        // Mark Node.js modules and sqlite directory as external
        return id === 'better-sqlite3' ||
               id === 'bcrypt' ||
               id === 'fs' ||
               id === 'path' ||
               id === 'crypto' ||
               id.includes('sqlite/database-manager') ||
               id.includes('sqlite/access-control') ||
               id.startsWith('@mapbox/node-pre-gyp') ||
               id === 'mock-aws-s3' ||
               id === 'aws-sdk' ||
               id === 'nock';
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'better-sqlite3',
      'bcrypt',
      'mock-aws-s3',
      'aws-sdk',
      'nock',
    ],
  },
}));
