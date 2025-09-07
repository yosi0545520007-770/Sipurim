import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// קובץ נקי: export default יחיד בלבד
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
