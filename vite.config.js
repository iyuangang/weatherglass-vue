import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Relative asset URLs work on both username.github.io and /repository/ sites.
export default defineConfig({
  plugins: [vue()],
  base: './',
})
