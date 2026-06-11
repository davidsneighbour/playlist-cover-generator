import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build: bundles the ImageGenerator component for distribution on npm.
// React, React-DOM, and Headless UI are left external (React/React-DOM are peer
// dependencies; Headless UI is a regular dependency installed alongside) so the
// host app dedupes them. The demo app build still uses the default vite.config.js.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        'posterboy-image-generator': 'src/index.js',
        'generate.node': 'src/generate.node.js',
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'react/jsx-runtime',
        '@headlessui/react',
        'lucide-react',
        '@resvg/resvg-js',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/server': 'ReactDOMServer',
          'react/jsx-runtime': 'jsxRuntime',
          '@headlessui/react': 'HeadlessUI',
          'lucide-react': 'lucide',
        },
      },
    },
  },
})
