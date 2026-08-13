import { defineConfig } from 'vitest/config'
import path from 'node:path'

const projectRoot = process.cwd()

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': projectRoot } },
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(projectRoot, 'tests/setup.ts')],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
