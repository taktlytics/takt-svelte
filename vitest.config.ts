import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [
    svelte({
      hot: false,
      dynamicCompileOptions({ filename }) {
        if (filename.includes('/element/')) return { customElement: true }
      },
    }),
  ],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    environmentOptions: { jsdom: { url: 'https://example.com/' } },
  },
})
