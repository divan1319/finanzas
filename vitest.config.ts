import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node'
  },
  resolve: {
    alias: {
      '#shared': resolve(import.meta.dirname, './shared')
    }
  }
})
