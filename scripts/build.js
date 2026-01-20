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
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  treeShaking: true,
  outfile: 'dist/main.js',
  plugins: [edgeWorkersGlobals({
    include: ['create-response', 'crypto', 'encoding']
  })],
  external: ['./edgekv.js', './edgekv_tokens.js'],
  // define: {
  //   'process.env.NODE_ENV': '"production"',
  // },
}).then(() => {
  // Copy edgekv files to dist
  fs.copyFileSync('src/edgekv.js', 'dist/edgekv.js');
  fs.copyFileSync('src/edgekv_tokens.js', 'dist/edgekv_tokens.js');
}).catch(() => process.exit(1));
