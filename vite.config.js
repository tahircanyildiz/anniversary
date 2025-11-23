import { defineConfig } from 'vite';

export default defineConfig({
  // Root directory
  root: '.',

  // Build options
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  },

  // Development server
  server: {
    port: 3000,
    open: true
  }
});
