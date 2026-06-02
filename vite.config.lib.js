import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build: bundles the CoverGenerator component for distribution on npm.
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
      entry: 'src/index.js',
      name: 'PlaylistCoverGenerator',
      formats: ['es', 'cjs'],
      fileName: (format) => `playlist-cover-generator.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@headlessui/react'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          '@headlessui/react': 'HeadlessUI',
        },
      },
    },
  },
})
