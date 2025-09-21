// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Development server
  server: {
    port: 5173,
    host: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/**/*.spec.{js,jsx}',
        'src/main.jsx'
      ]
    },
    
    // Dependencies configuration for ES modules
    deps: {
      inline: [
        '@testing-library/user-event',
        '@testing-library/react'
      ]
    },
    
    // Environment variables
    env: {
      NODE_ENV: 'test'
    }
  }
})