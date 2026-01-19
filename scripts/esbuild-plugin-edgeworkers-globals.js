/**
 * esbuild-plugin-edgeworkers-globals
 * 
 * Automatically exposes Akamai EdgeWorkers internal modules as global variables,
 * eliminating the need for import statements in your code.
 * 
 * @example
 * const esbuild = require('esbuild');
 * const edgeWorkersGlobals = require('./esbuild-plugin-edgeworkers-globals');
 * 
 * esbuild.build({
 *   entryPoints: ['src/main.js'],
 *   bundle: true,
 *   plugins: [edgeWorkersGlobals()],
 *   outfile: 'dist/main.js',
 * });
 */

const DEFAULT_MODULES = {
  'http-request': ['httpRequest'],
  'create-response': ['createResponse'],
  'cookies': ['Cookies'],
  'log': ['logger'],
  'url-search-params': ['URLSearchParams'],
  'encoding': ['atob', 'btoa', 'base64', 'base64url', 'base16', 'TextEncoder', 'TextDecoder'],
  'text-encode-transform': ['TextEncoderStream', 'TextDecoderStream'],
  'streams': ['WritableStream', 'ReadableStream', 'TransformStream'],
  'crypto': ['crypto'],
};

/**
 * Creates an esbuild plugin that exposes EdgeWorkers modules as globals
 * 
 * @param {Object} options - Plugin options
 * @param {Object} options.modules - Custom module mappings (merged with defaults)
 * @param {boolean} options.onlySpecified - If true, only use custom modules (ignore defaults)
 * @param {string[]} options.include - Array of module names to include (filters defaults)
 * @param {string[]} options.exclude - Array of module names to exclude
 * @param {boolean} options.minify - Minify the generated banner code (default: false)
 * @returns {Object} esbuild plugin
 */
function edgeWorkersGlobals(options = {}) {
  const {
    modules = {},
    onlySpecified = false,
    include = null,
    exclude = [],
    minify = false,
  } = options;

  return {
    name: 'edgeworkers-globals',
    setup(build) {
      // Determine which modules to expose
      let moduleMap = onlySpecified ? modules : { ...DEFAULT_MODULES, ...modules };

      // Filter by include list
      if (include && Array.isArray(include)) {
        moduleMap = Object.fromEntries(
          Object.entries(moduleMap).filter(([mod]) => include.includes(mod))
        );
      }

      // Filter by exclude list
      if (exclude && Array.isArray(exclude)) {
        moduleMap = Object.fromEntries(
          Object.entries(moduleMap).filter(([mod]) => !exclude.includes(mod))
        );
      }

      // Add all modules to externals
      const externalModules = Object.keys(moduleMap);
      build.initialOptions.external = [
        ...(build.initialOptions.external || []),
        ...externalModules,
      ];

      // Ensure format is ESM
      if (!build.initialOptions.format) {
        build.initialOptions.format = 'esm';
      }

      // Generate import statements
      const imports = Object.entries(moduleMap)
        .map(([moduleName, exports]) => {
          const exportList = exports.join(', ');
          return `import { ${exportList} } from '${moduleName}';`;
        })
        .join(minify ? '' : '\n');

      // Generate global assignments
      const assignments = Object.values(moduleMap)
        .flat()
        .map(exportName => `globalThis.${exportName} = ${exportName};`)
        .join(minify ? '' : '\n');

      // Combine into banner
      const banner = minify 
        ? `${imports}${assignments}`
        : `${imports}\n\n${assignments}\n`;

      // Set banner
      build.initialOptions.banner = {
        ...(build.initialOptions.banner || {}),
        js: (build.initialOptions.banner?.js || '') + banner,
      };
    },
  };
}

module.exports = edgeWorkersGlobals;