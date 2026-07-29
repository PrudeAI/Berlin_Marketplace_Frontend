import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // No hardcoded port: Vite defaults to 5173 and auto-increments if it's taken.
    // Not forcing host to IPv4-only ('0.0.0.0') so Vite binds the same address family
    // as `localhost`, which lets it actually detect a busy port and bump to the next one.
    proxy: {
      '/api': {
        // target must be a SINGLE url string. Use the local backend for dev.
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
