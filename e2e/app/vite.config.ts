import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@vskstudio/takt-svelte/actions': resolve(__dirname, '../../dist/actions/index.js'),
      '@vskstudio/takt-svelte': resolve(__dirname, '../../dist/index.js'),
    },
  },
})
