import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/lib/element'],
      outDir: 'dist/element',
      entryRoot: 'src/lib/element',
    }),
  ],
  build: {
    emptyOutDir: false,
    outDir: 'dist/element',
    lib: {
      entry: 'src/lib/element/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
  },
})
