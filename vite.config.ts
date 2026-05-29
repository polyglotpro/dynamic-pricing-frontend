import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: 'C:/tmp/dynamic-pricing-frontend-vite-cache',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
