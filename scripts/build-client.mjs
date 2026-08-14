import { build } from 'esbuild'

const pluginId = 'dsh-vision-bridge'

await build({
  entryPoints: ['src/client.tsx'],
  outfile: 'lib/client.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120', 'edge120', 'firefox121', 'safari17'],
  jsx: 'automatic',
  sourcemap: true,
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pluginId)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: { js: 'return module.exports; } });' },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
  logLevel: 'info',
})
