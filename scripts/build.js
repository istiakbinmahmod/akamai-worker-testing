#!/usr/bin/env node
const edgeWorkersGlobals = require('./esbuild-plugin-edgeworkers-globals');
const esbuild = require('esbuild');
const fs = require('fs');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build with esbuild
esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  minify: true,
  treeShaking: true,
  outfile: 'dist/main.js',
  plugins: [edgeWorkersGlobals({
    include: ['create-response', 'crypto', 'encoding', 'http-request', 'html-rewriter', 'streams', 'log']
  })],
  external: ['./edgekv.js', './edgekv_tokens.js', 'html-rewriter'],
  banner: {
    js: `import { EdgeKV } from './edgekv.js';\nglobalThis.EdgeKV = EdgeKV;\n`
  },
}).then(() => {
  // Copy edgekv files to dist
  fs.copyFileSync('src/edgekv.js', 'dist/edgekv.js');
  fs.copyFileSync('src/edgekv_tokens.js', 'dist/edgekv_tokens.js');
}).catch(() => process.exit(1));
