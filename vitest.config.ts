import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(process.cwd()) } },
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(process.cwd(), 'tests/setup.ts')],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
